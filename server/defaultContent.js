// Nội dung mặc định của thiệp — lấy đúng theo file Figma "Wedding"
// (node 1:2 bìa thiệp, node 1:41 trang nội dung).
// Toàn bộ dữ liệu này chỉnh được trong trang /admin.
export const defaultContent = {
  meta: {
    title: "Thiệp cưới Nguyên Anh & Hồng Thúy",
    description: "Trân trọng kính mời bạn đến chung vui cùng chúng tôi",
    favicon: "",
    ogImage: "",
  },

  theme: {
    primary: "#511419", // đỏ đô của các panel
    primaryDark: "#3B0E12",
    accent: "#B58B2F", // vàng đồng của ✦
    background: "#F8F1E5", // nền cột giấy kem (màu Figma sau lớp vân giấy)
    surface: "#ECE4D8", // chữ/nền sáng trên panel đỏ
    text: "#511419",
    muted: "#7D5A56",
    headingFont: "'Playfair Display', serif",
    scriptFont: "'The Nautigal', cursive",
    bodyFont: "'Inter', sans-serif",
  },

  layout: {
    pageWidth: 900, // bề rộng cột giấy (Figma: 900)
    panelWidth: 560, // bề rộng panel đỏ (Figma: 560)
    outerBackground: "#FFFFFF",
    footerNote:
      "Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi!",
    showFooterNames: false,
  },

  effects: {
    petals: false,
    petalsDensity: 14,
    revealAnimation: true,
    parallax: true,
    grain: false,
  },

  music: {
    enabled: true,
    url: "",
    volume: 0.6,
    autoPlayOnOpen: true,
  },

  cover: {
    greeting: "",
    groomName: "Nguyên Anh",
    brideName: "Hồng Thúy",
    ampersand: "&",
    dateText: "20 tháng 9, 2026",
    subText: "Thân Mời",
    buttonText: "Mở thiệp",
    backgroundImage: "",
    photo: "",
    seal: "❦",
  },

  couple: {
    groom: {
      name: "Lê Nguyên Anh",
      shortName: "Nguyên Anh",
      role: "Chú rể",
      photo: "",
      quote: "Anh sẽ luôn ở đây, mỗi ngày, suốt đời.",
      father: "Lê Nguyên Thủy",
      mother: "Lê Thị Duyến",
      address: "Xã Thiệu Trung, Tỉnh Thanh Hóa",
      facebook: "",
    },
    bride: {
      name: "Nhâm Thị Hồng Thúy",
      shortName: "Hồng Thúy",
      role: "Cô dâu",
      photo: "",
      quote: "Cảm ơn anh vì đã đến, và ở lại.",
      father: "Nhâm Văn Thanh",
      mother: "Lưu Thị Dinh",
      address: "Xã Nam Đông Hưng, Tỉnh Hưng Yên",
      facebook: "",
    },
  },

  // Thứ tự trong mảng = thứ tự hiển thị trên thiệp. enabled = ẩn/hiện.
  sections: [
    {
      id: "opening",
      type: "opening",
      enabled: true,
      kicker: "Save The Date",
      image: "/figma/demo-cover.jpg",
      imageTilt: 7,
      nameLine1: "Nguyên Anh",
      nameLine2: "Hồng Thúy",
    },
    {
      id: "invitation",
      type: "invitation",
      enabled: true,
      panelTitle: "Thông tin lễ cưới",
      showFamily: true,
      groomSideLabel: "Ông Bà",
      brideSideLabel: "Ông Bà",
      middleNote: "Trân trọng báo tin\nlễ thành hôn của con chúng tôi",
      venueLine: "Lễ thành hôn được cử hành tại\nTư gia",
      eventDate: "2026-09-20",
      eventTime: "13:00",
      lunarLine: "(Tức ngày 10 tháng 8 âm lịch)",
      addressLine: "",
      footNote: "",
    },
    {
      id: "gallery",
      type: "gallery",
      enabled: true,
      title: "Album Ảnh",
      subtitle: "",
      photos: [
        { id: "p1", url: "/figma/demo-1.jpg", caption: "" },
        { id: "p2", url: "/figma/demo-cover.jpg", caption: "" },
      ],
    },
    {
      id: "party",
      type: "calendar",
      enabled: true,
      panelTitle: "Thông tin tiệc cưới",
      script: "Tiệc cưới sẽ diễn ra vào lúc:",
      targetDate: "2026-09-19T16:00",
      lunarText: "(Tức ngày 9 tháng 8 âm lịch)",
      reception: [
        { id: "r1", label: "Đón khách", time: "16:00" },
        { id: "r2", label: "Khai tiệc", time: "16:30" },
      ],
      showCountdown: false,
      showCalendar: true,
      markDate: "2026-09-20",
      calendarLinkText: "Thêm vào lịch",
    },

    /* Không phải một phần riêng trên thiệp: cấu hình cho nút + modal
       "Xác nhận tham dự" nằm trong panel tiệc cưới ở trên. */
    {
      id: "rsvp",
      type: "rsvp",
      enabled: true,
      title: "Xác nhận tham dự",
      buttonText: "Xác nhận tham dự",
      modalTitle: "Xác nhận tham dự",
      subtitle: "Bạn có thể đến chung vui cùng chúng mình chứ?",
      note: "Vui lòng phản hồi trước ngày 10.09.2026",
      askAttendance: true,
      askGuestCount: true,
      askSide: true,
      thankYouText:
        "Cảm ơn bạn rất nhiều! Hẹn gặp bạn trong ngày vui của chúng mình.",
    },
    {
      id: "map",
      type: "map",
      enabled: true,
      title: "Tiệc cưới sẽ tổ chức tại",
      subtitle: "",
      // Toạ độ 19°52'34.5"N 105°41'03.4"E (Plus Code VMGM+GP3) đổi sang thập
      // phân. Ghim theo toạ độ vì tra theo tên "Thieu Trung" chỉ ra được tâm xã.
      embedUrl: "19.87625,105.684278",
      directionUrl: "19.87625,105.684278",
      showDirection: false,
      placeName: "Thieu Trung, Thanh Hoa",
      address: "Thieu Trung, Thanh Hoa, Vietnam",
    },
    {
      id: "events",
      type: "events",
      enabled: true,
      panelTitle: "Lịch trình ngày cưới",
      items: [
        {
          id: "e1",
          time: "12:30",
          label: "Đón khách",
          icon: "camera",
          note: "",
        },
        {
          id: "e2",
          time: "13:00",
          label: "Nghi thức cưới",
          icon: "cake",
          note: "",
        },
        {
          id: "e3",
          time: "13:30",
          label: "Cắt bánh & nâng ly",
          icon: "cook",
          note: "",
        },
        { id: "e4", time: "14:00", label: "Kết thúc tiệc", icon: "", note: "" },
      ],
    },
    {
      id: "wishes",
      type: "wishes",
      enabled: true,
      title: "Sổ lưu bút",
      subtitle: "",
      placeholder: "Nhập lời chúc*",
      buttonText: "Gửi lời chúc",
      showList: true,
    },
    {
      id: "gift",
      type: "gift",
      enabled: true,
      title: "Hộp Quà Mừng",
      subtitle: "",
      buttonText: "Nhấn để mở",
      modalTitle: "Gửi mừng cưới",
      accounts: [
        {
          id: "g1",
          side: "Nhà trai",
          owner: "LE NGUYEN ANH",
          bank: "Vietcombank",
          number: "0123456789",
          qr: "",
        },
        {
          id: "g2",
          side: "Nhà gái",
          owner: "NHAM THI HONG THUY",
          bank: "Techcombank",
          number: "9876543210",
          qr: "",
        },
      ],
    },

    /* --- Các phần không có trong Figma, mặc định tắt --- */
    {
      id: "thanks",
      type: "thanks",
      enabled: false,
      title: "Cảm ơn bạn",
      body: "Cảm ơn bạn đã dành thời gian đọc thiệp mời của chúng mình.\nHẹn gặp bạn trong ngày trọng đại!",
      image: "",
      signature: "Nguyên Anh & Hồng Thúy",
    },
    {
      id: "couple",
      type: "couple",
      enabled: false,
      title: "Cô dâu & Chú rể",
      subtitle: "Hai con người, một câu chuyện",
      showFamily: true,
    },
    {
      id: "story",
      type: "story",
      enabled: false,
      title: "Chuyện tình yêu",
      subtitle: "Những cột mốc của chúng mình",
      items: [
        {
          id: "s1",
          date: "06.2019",
          title: "Lần đầu gặp nhau",
          text: "Một buổi chiều mưa, hai đứa tình cờ trú chung một mái hiên.",
          image: "",
        },
        {
          id: "s2",
          date: "02.2021",
          title: "Chính thức yêu",
          text: "Sau bao lần ngập ngừng, cuối cùng cũng nắm được tay nhau.",
          image: "",
        },
        {
          id: "s3",
          date: "10.2025",
          title: "Lời cầu hôn",
          text: "Anh quỳ xuống và em đã khóc. Câu trả lời là: Đồng ý!",
          image: "",
        },
      ],
    },
  ],
};

export const defaultState = {
  content: defaultContent,
  rsvp: [],
  wishes: [],
};
