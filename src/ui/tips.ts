/** Mẹo ngắn hiện ở màn nạp (chỉ nói điều thật sự có ích khi chơi) */
export const TIPS = [
  'Kỹ năng đạt Cấp 5 và có bị động liên kết sẽ ra thẻ thức tỉnh ở lần lên cấp kế tiếp.',
  'Bí bảo chỉ nhận được ở màn cố định, và chỉ lần vượt đầu tiên.',
  'Tái luyện thuộc tính phụ tốn Tinh hoa, thu được khi phân giải đồ phẩm Thánh trở lên.',
  'Nhấn X trong trận để đổi tốc độ x1 / x2 / x4.',
  'Túi đầy vẫn không mất bí bảo: đồ sẽ chờ trong hòm thưởng.',
  'Thẻ bị động ghi rõ nó liên kết với kỹ năng nào trong bộ đang mang.',
];
export const randomTip = (): string => TIPS[Math.floor(Math.random() * TIPS.length)];
