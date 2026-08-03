const AUDIO_BASE_URL = "https://intellicare-tainh.onrender.com/audio";

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
 * CHỈ LẤY 2 CHỮ SỐ THẬP PHÂN (làm tròn). Phần thập phân đọc theo từng
 * chữ số riêng lẻ (VD: 62.05 -> "sáu mươi hai phẩy không năm") để tránh
 * nhầm lẫn ngữ pháp phức tạp (không cần "mươi/lăm/mốt" cho phần lẻ).
 */
export function buildWeightAudioQueue(weightKg: number): string[] {
  const queue: string[] = [];

  // Làm tròn về đúng 2 chữ số thập phân (đơn vị: phần trăm kg)
  const totalCenti = Math.round(weightKg * 100);
  const intPart = Math.floor(totalCenti / 100); // Phần Ký (số nguyên)
  const decimalPart = totalCenti % 100; // Phần thập phân, 0-99

  // --- Đọc phần nguyên (Ký) ---
  if (intPart === 0) {
    queue.push("0");
  } else {
    pushNaturalNumber(intPart, queue);
  }

  // --- Đọc phần thập phân (2 chữ số, đọc từng số riêng) ---
  if (decimalPart > 0) {
    queue.push("phay");
    const d1 = Math.floor(decimalPart / 10); // Chữ số hàng chục của phần lẻ
    const d2 = decimalPart % 10; // Chữ số hàng đơn vị của phần lẻ
    queue.push(String(d1));
    queue.push(String(d2));
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
