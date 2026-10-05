// Validation dùng chung cho form đăng ký Workshop.
// Mỗi hàm trả về chuỗi lỗi (tiếng Việt) hoặc "" nếu hợp lệ.

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254; // giới hạn theo RFC 5321

// Chỉ cho phép chữ cái (có dấu tiếng Việt), khoảng trắng, dấu ' . -
// Ký tự đầu phải là chữ cái; chặn số và ký tự đặc biệt.
const NAME_REGEX = /^\p{L}[\p{L}\p{M}\s'.-]*$/u;

// Local part: chữ, số, . _ % + -  (không bắt đầu/kết thúc bằng dấu chấm,
// không có 2 dấu chấm liên tiếp). Domain: nhãn không bắt đầu/kết thúc bằng '-',
// ít nhất 1 dấu chấm, TLD >= 2 chữ cái.
const EMAIL_REGEX =
  /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Gộp nhiều khoảng trắng liên tiếp thành 1 và cắt đầu/cuối. */
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Email không phân biệt hoa/thường -> chuẩn hoá về chữ thường. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateFullName(value: string): string {
  const name = normalizeName(value);

  if (!name) return "Vui lòng nhập họ và tên.";
  if (name.length < NAME_MIN_LENGTH) {
    return `Họ và tên phải có ít nhất ${NAME_MIN_LENGTH} ký tự.`;
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `Họ và tên không được vượt quá ${NAME_MAX_LENGTH} ký tự.`;
  }
  if (!NAME_REGEX.test(name)) {
    return "Họ và tên chỉ được chứa chữ cái, không chứa số hoặc ký tự đặc biệt.";
  }
  return "";
}

export function validateEmail(value: string): string {
  const email = normalizeEmail(value);

  if (!email) return "Vui lòng nhập email.";
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Email không được vượt quá ${EMAIL_MAX_LENGTH} ký tự.`;
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Email không hợp lệ. VD: nguyenvana@gmail.com";
  }
  return "";
}
