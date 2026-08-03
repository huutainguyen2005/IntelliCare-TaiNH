// Port lại 1:1 từ intellicare-iot-scale/src/audio_manager.cpp (hàm
// pushNaturalNumber + audio_speakWeight) - giữ nguyên logic đọc số tiếng
// Việt tự nhiên, chỉ đổi từ phát qua loa I2S ESP32 sang phát qua loa
// iPad/laptop (loa lớn hơn nhiều, dễ nghe hơn khi demo Kiosk).

const AUDIO_BASE_URL = "https://intellicare-tainh.onrender.com/audio";

// Ngưỡng biên độ coi là "im lặng" (0-1) - dùng để cắt khoảng lặng thừa ở
// đầu/cuối mỗi file, giúp đọc nhanh/liền mạch hơn MÀ KHÔNG đổi cao độ giọng
// (khác hẳn cách tăng playbackRate trực tiếp, vốn làm giọng bị cao/nhanh
// kiểu "minion" vì AudioBufferSourceNode không tự giữ cao độ khi đổi tốc độ).
const SILENCE_THRESHOLD = 0.012;

// Khoảng nghỉ thêm giữa mỗi từ (giây) - ngoài phần đệm đã giữ lại trong
// mỗi file, tạo nhịp nghỉ rõ ràng hơn, dễ nghe hơn cho người lớn tuổi.
const INTER_WORD_GAP = 0.08;

const audioUrl = (name: string) => `${AUDIO_BASE_URL}/${name}.mp3`;

/**
 * Làm tròn + format số cân về đúng 2 chữ số thập phân, dùng chung cho cả
 * hiển thị trên màn hình lẫn đọc âm thanh - đảm bảo 2 nơi luôn khớp nhau.
 */
export function formatWeight(weightKg: number): string {
  return weightKg.toFixed(2);
}

/**
 * Ghép chuỗi tên file audio cần phát theo đúng ngữ pháp đọc số tiếng Việt
 * (1 -> 999), y hệt thuật toán pushNaturalNumber() bên firmware ESP32.
 */
function pushNaturalNumber(num: number, queue: string[]): void {
  if (num === 0) return;

  const tram = Math.floor(num / 100);
  const chuc = Math.floor((num % 100) / 10);
  const donvi = num % 10;

  if (tram > 0) {
    queue.push(String(tram));
    queue.push("tram");
    if (chuc === 0 && donvi > 0) {
      queue.push("linh");
    }
  }

  if (chuc > 0) {
    if (chuc === 1) {
      queue.push("10");
    } else {
      queue.push(String(chuc));
      queue.push("muoi");
    }
  }

  if (donvi > 0) {
    if (chuc > 0 && donvi === 5) {
      queue.push("lam");
    } else if (chuc > 1 && donvi === 1) {
      queue.push("mot");
    } else if (chuc === 1 && donvi === 1) {
      queue.push("1");
    } else {
      queue.push(String(donvi));
    }
  }
}

/**
 * Ghép toàn bộ chuỗi tên file cần phát để đọc trọn 1 số cân nặng (kg),
 * CHỈ LẤY 2 CHỮ SỐ THẬP PHÂN (làm tròn). Phần thập phân đọc TỰ NHIÊN như
 * 1 số 2 chữ số bình thường (VD: 78 -> "bảy mươi tám").
 */
export function buildWeightAudioQueue(weightKg: number): string[] {
  const queue: string[] = [];

  const totalCenti = Math.round(weightKg * 100);
  const intPart = Math.floor(totalCenti / 100);
  const decimalPart = totalCenti % 100;

  if (intPart === 0) {
    queue.push("0");
  } else {
    pushNaturalNumber(intPart, queue);
  }

  if (decimalPart > 0) {
    queue.push("phay");
    if (decimalPart < 10) {
      queue.push("0");
      queue.push(String(decimalPart));
    } else {
      pushNaturalNumber(decimalPart, queue);
    }
  }

  queue.push("kylogam");
  return queue;
}

// ============================================================
// PHÁT ÂM THANH BẰNG WEB AUDIO API - tải trước toàn bộ câu, cắt khoảng
// lặng thừa đầu/cuối mỗi file rồi ghép phát liền mạch, KHÔNG đổi cao độ
// giọng (giữ nguyên playbackRate = 1.0, chỉ cắt phần im lặng để nhanh hơn).
// ============================================================

let audioContext: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** Tải + giải mã 1 file MP3, có cache lại (số/từ lặp lại không cần tải lại) */
async function loadBuffer(name: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(name);
  if (cached) return cached;

  const ctx = getAudioContext();
  const response = await fetch(audioUrl(name));
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  bufferCache.set(name, audioBuffer);
  return audioBuffer;
}

/**
 * Tìm khoảng thời gian (giây) cần cắt ở đầu/cuối buffer vì là khoảng lặng,
 * dựa theo biên độ tín hiệu kênh đầu tiên. Không sửa dữ liệu buffer gốc,
 * chỉ tính offset để dùng với AudioBufferSourceNode.start(when, offset,
 * duration) - phát đúng đoạn có tiếng, bỏ qua phần lặng thừa.
 */
function findTrimBounds(buffer: AudioBuffer): { start: number; end: number } {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  let startSample = 0;
  let endSample = data.length - 1;

  while (
    startSample < data.length &&
    Math.abs(data[startSample]) < SILENCE_THRESHOLD
  ) {
    startSample++;
  }
  while (
    endSample > startSample &&
    Math.abs(data[endSample]) < SILENCE_THRESHOLD
  ) {
    endSample--;
  }

  // Chừa lại 1 chút đệm (10ms) mỗi đầu, tránh cắt cụt mất âm đầu/cuối chữ
  const paddingSamples = Math.floor(sampleRate * 0.06);
  const start = Math.max(0, startSample - paddingSamples) / sampleRate;
  const end =
    Math.min(data.length - 1, endSample + paddingSamples) / sampleRate;

  return { start, end };
}

/**
 * Tải trước TOÀN BỘ file trong câu (song song), rồi ghép phát nối tiếp
 * nhau - đã cắt khoảng lặng thừa đầu/cuối mỗi file nên nghe liền mạch và
 * nhanh hơn, giữ nguyên cao độ giọng gốc (không bị "minion").
 */
async function playGapless(fileNames: string[]): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  let buffers: AudioBuffer[];
  try {
    buffers = await Promise.all(fileNames.map((name) => loadBuffer(name)));
  } catch (error) {
    console.error("Lỗi tải audio:", error);
    return;
  }

  return new Promise((resolve) => {
    let startTime = ctx.currentTime + 0.05;
    let remaining = buffers.length;

    if (remaining === 0) {
      resolve();
      return;
    }

    buffers.forEach((buffer) => {
      const { start, end } = findTrimBounds(buffer);
      const playDuration = Math.max(0.05, end - start);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      // KHÔNG đổi playbackRate - giữ nguyên giọng gốc, tránh hiệu ứng "minion"
      source.connect(ctx.destination);
      source.start(startTime, start, playDuration);

      startTime += playDuration + INTER_WORD_GAP;

      source.onended = () => {
        remaining--;
        if (remaining === 0) resolve();
      };
    });
  });
}

/**
 * Đọc to 1 số cân nặng (kg) qua loa thiết bị đang chạy web (iPad/laptop).
 * Gọi hàm này ngay khi nhận được kết quả cân từ Backend.
 *
 * Đọc trọn 1 câu tự động theo đúng mẫu:
 * "Cân nặng hiện tại của bạn là {số} kg. Xin nhắc lại {số} kg."
 * (phan_tich.mp3 mở đầu, nhac_lai.mp3 trước lượt đọc lại - không cần bấm
 * nút gì thêm, tự động đọc 2 lượt liền trong cùng 1 lần gọi hàm này.)
 */
export function speakWeight(weightKg: number): Promise<void> {
  const numberPart = buildWeightAudioQueue(weightKg); // đã có sẵn "kylogam" ở cuối
  const queue = ["phan_tich", ...numberPart, "nhac_lai", ...numberPart];
  return playGapless(queue);
}
