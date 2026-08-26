import OpeningSection from './OpeningSection.jsx';
import InvitationSection from './InvitationSection.jsx';
import CalendarSection from './CalendarSection.jsx';
import GallerySection from './GallerySection.jsx';
import EventsSection from './EventsSection.jsx';
import WishesSection from './WishesSection.jsx';
import GiftSection from './GiftSection.jsx';
import ThanksSection from './ThanksSection.jsx';
import CoupleSection from './CoupleSection.jsx';
import StorySection from './StorySection.jsx';

/** type trong content.sections -> component hiển thị */
export const SECTION_COMPONENTS = {
  opening: OpeningSection,
  invitation: InvitationSection,
  calendar: CalendarSection,
  gallery: GallerySection,
  events: EventsSection,
  wishes: WishesSection,
  gift: GiftSection,
  thanks: ThanksSection,
  couple: CoupleSection,
  story: StorySection,

  // tương thích dữ liệu cũ
  hero: OpeningSection,
  countdown: CalendarSection
};

/** Nhãn tiếng Việt dùng trong trang quản trị */
export const SECTION_LABELS = {
  opening: 'Mở đầu (phong thư + tên đôi)',
  invitation: 'Thông tin lễ cưới (panel đỏ)',
  calendar: 'Thông tin tiệc cưới + lịch tháng',
  map: 'Bản đồ (nút trong panel tiệc cưới)',
  gallery: 'Album ảnh (coverflow)',
  events: 'Lịch trình ngày cưới',
  rsvp: 'Xác nhận tham dự (nút trong panel tiệc cưới)',
  wishes: 'Sổ lưu bút',
  gift: 'Hộp quà mừng (QR)',
  thanks: 'Lời cảm ơn',
  couple: 'Cô dâu & Chú rể',
  story: 'Chuyện tình yêu',
  hero: 'Mở đầu',
  countdown: 'Thông tin tiệc cưới'
};
