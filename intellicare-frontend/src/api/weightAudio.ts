const AUDIO_BASE_URL = "https://intellicare-tainh.onrender.com/audio";

const audioUrl = (name: string) => `${AUDIO_BASE_URL}/${name}.mp3`;

/**
 * Ghép chuỗi tên file audio cần phát theo đúng ngữ pháp đọc số tiếng Việt
 * (1 -> 999), y hệt thuật toán pushNaturalNumber() bên firmware ESP32.
 */
function pushNaturalNumber(num: number, queue: string[]): void {
  if (num === 0) return;

  const tram = Math.floor(num / 100);
  const chuc = Math.floor((num % 100) / 10);
  const donvi = num % 10;

  // 1. Hàng trăm
  if (tram > 0) {
    queue.push(String(tram));
    queue.push("tram");
    if (chuc === 0 && donvi > 0) {
      queue.push("linh"); // VD: Chín trăm lẻ năm
    }
  }

  // 2. Hàng chục
  if (chuc > 0) {
    if (chuc === 1) {
      queue.push("10"); // "Mười"
    } else {
      queue.push(String(chuc));
      queue.push("muoi"); // "Mươi"
    }
  }

  // 3. Hàng đơn vị
  if (donvi > 0) {
    if (chuc > 0 && donvi === 5) {
      queue.push("lam"); // 15, 25 -> "lăm"
    } else if (chuc > 1 && donvi === 1) {
      queue.push("mot"); // 21, 31 -> "mốt"
    } else if (chuc === 1 && donvi === 1) {
      queue.push("1"); // 11 -> "mười một"
    } else {
      queue.push(String(donvi));
    }
  }
}

/**
 * Ghép toàn bộ chuỗi tên file cần phát để đọc trọn 1 số cân nặng (kg),
 * y hệt thuật toán audio_speakWeight() bên firmware ESP32.
 */
export function buildWeightAudioQueue(weightKg: number): string[] {
  const queue: string[] = [];

  // Đổi ra gram, làm tròn để tránh sai số thập phân
  const totalGrams = Math.round(weightKg * 1000);
  const intPart = Math.floor(totalGrams / 1000); // Phần Ký
  const decimalPart = totalGrams % 1000; // Phần Gram

  // --- Đọc phần nguyên (Ký) ---
  if (intPart === 0) {
    queue.push("0");
  } else {
    pushNaturalNumber(intPart, queue);
  }

  // --- Đọc phần thập phân ---
  if (decimalPart > 0) {
    queue.push("phay");

    const d1 = Math.floor(decimalPart / 100) % 10;
    const d2 = Math.floor(decimalPart / 10) % 10;
    const d3 = decimalPart % 10;

    if (d1 === 0) {
      queue.push("0");
      if (d2 === 0) {
        queue.push("0");
        queue.push(String(d3));
      } else {
        pushNaturalNumber(d2 * 10 + d3, queue);
      }
    } else {
      pushNaturalNumber(decimalPart, queue);
    }
  }

  queue.push("kylogam");
  return queue;
}

/**
 * Phát tuần tự 1 danh sách file MP3 (chờ file trước phát xong mới sang
 * file sau). Trả về Promise resolve khi phát hết toàn bộ hàng đợi.
 */
function playSequential(fileNames: string[]): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;

    const playNext = () => {
      if (index >= fileNames.length) {
        resolve();
        return;
      }
      const audio = new Audio(audioUrl(fileNames[index]));
      index++;
      audio.onended = playNext;
      audio.onerror = playNext; // Lỗi 1 file thì bỏ qua, phát tiếp file sau
      audio.play().catch(playNext); // Trình duyệt chặn autoplay thì bỏ qua luôn
    };

    playNext();
  });
}

/**
 * Đọc to 1 số cân nặng (kg) qua loa thiết bị đang chạy web (iPad/laptop).
 * Gọi hàm này ngay khi nhận được kết quả cân từ Backend.
 */
export function speakWeight(weightKg: number): Promise<void> {
  const queue = buildWeightAudioQueue(weightKg);
  return playSequential(queue);
}
