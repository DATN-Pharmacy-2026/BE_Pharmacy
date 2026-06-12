export interface RealProductCatalogItem {
  name: string;
  activeIngredient: string;
  group: string;
  indication: string;
  usage: string;
  caution: string;
  storage: string;
}

export const LEGACY_SAMPLE_PRODUCT_SKUS = [
  'PARA-500MG-TAB-01',
  'VITC-1000MG-EFF-01',
  'BPM-DEVICE-ARM-01',
  'SALINE-NASAL-01',
  'AMOX-500MG-CAP-01',
];

export const REAL_PRODUCT_CATALOG: RealProductCatalogItem[] = [
  {
    name: 'Panadol',
    activeIngredient: 'Paracetamol / Acetaminophen',
    group: 'Giảm đau, hạ sốt',
    indication: 'Hỗ trợ giảm đau nhẹ đến vừa, hạ sốt',
    usage: 'Uống theo hướng dẫn trên bao bì hoặc theo chỉ định nhân viên y tế',
    caution: 'Không dùng quá liều; tránh dùng đồng thời nhiều thuốc cùng chứa paracetamol vì có nguy cơ tổn thương gan',
    storage: 'Nơi khô mát, tránh ánh sáng, xa trẻ em',
  },
  {
    name: 'Efferalgan',
    activeIngredient: 'Paracetamol',
    group: 'Giảm đau, hạ sốt',
    indication: 'Giảm đau, hạ sốt',
    usage: 'Hòa tan viên sủi trong nước rồi uống theo hướng dẫn',
    caution: 'Thận trọng với người bệnh gan, người uống rượu nhiều',
    storage: 'Đậy kín, tránh ẩm',
  },
  {
    name: 'Hapacol',
    activeIngredient: 'Paracetamol',
    group: 'Giảm đau, hạ sốt',
    indication: 'Hạ sốt, giảm đau đầu, đau cơ',
    usage: 'Uống theo đúng hàm lượng và hướng dẫn',
    caution: 'Không tự ý dùng kéo dài nếu sốt cao hoặc đau kéo dài',
    storage: 'Nơi khô ráo, tránh nhiệt độ cao',
  },
  {
    name: 'Ibuprofen',
    activeIngredient: 'Ibuprofen',
    group: 'NSAID',
    indication: 'Giảm đau, hạ sốt, giảm viêm',
    usage: 'Uống sau ăn hoặc theo hướng dẫn',
    caution: 'Thận trọng với người đau dạ dày, bệnh thận, đang dùng thuốc chống đông',
    storage: 'Nơi khô mát, tránh ánh sáng',
  },
  {
    name: 'Nurofen',
    activeIngredient: 'Ibuprofen',
    group: 'NSAID',
    indication: 'Giảm đau, hạ sốt',
    usage: 'Dùng theo hướng dẫn trên nhãn',
    caution: 'Không dùng nếu dị ứng NSAID; hỏi dược sĩ nếu có tiền sử loét dạ dày',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Aspirin Bayer',
    activeIngredient: 'Aspirin / Acetylsalicylic acid',
    group: 'NSAID, chống kết tập tiểu cầu',
    indication: 'Giảm đau, hạ sốt; một số trường hợp dùng theo chỉ định tim mạch',
    usage: 'Uống theo chỉ định hoặc hướng dẫn',
    caution: 'Không tự dùng cho trẻ em; thận trọng nguy cơ chảy máu, loét dạ dày',
    storage: 'Tránh ẩm, tránh nhiệt',
  },
  {
    name: 'Diclofenac',
    activeIngredient: 'Diclofenac',
    group: 'NSAID',
    indication: 'Giảm đau, kháng viêm',
    usage: 'Uống hoặc dùng ngoài da tùy dạng bào chế',
    caution: 'NSAID như diclofenac có thể gây loét/xuất huyết tiêu hóa, cần thận trọng ở người có bệnh dạ dày hoặc dùng kéo dài',
    storage: 'Nơi khô mát, xa trẻ em',
  },
  {
    name: 'Voltaren Gel',
    activeIngredient: 'Diclofenac diethylamine',
    group: 'Giảm đau tại chỗ',
    indication: 'Hỗ trợ giảm đau cơ, khớp tại chỗ',
    usage: 'Thoa ngoài da vùng đau theo hướng dẫn',
    caution: 'Không bôi lên vết thương hở, tránh mắt/niêm mạc',
    storage: 'Đậy kín nắp, tránh nhiệt cao',
  },
  {
    name: 'Cetirizine',
    activeIngredient: 'Cetirizine',
    group: 'Kháng histamine',
    indication: 'Giảm triệu chứng dị ứng, viêm mũi dị ứng, mề đay',
    usage: 'Uống theo hướng dẫn',
    caution: 'Có thể gây buồn ngủ ở một số người; thận trọng khi lái xe',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Zyrtec',
    activeIngredient: 'Cetirizine',
    group: 'Kháng histamine',
    indication: 'Giảm hắt hơi, sổ mũi, ngứa do dị ứng',
    usage: 'Uống theo nhãn thuốc',
    caution: 'Không dùng chung rượu/bia nếu bị buồn ngủ',
    storage: 'Tránh ẩm, xa trẻ em',
  },
  {
    name: 'Loratadine',
    activeIngredient: 'Loratadine',
    group: 'Kháng histamine',
    indication: 'Giảm triệu chứng dị ứng',
    usage: 'Uống theo hướng dẫn',
    caution: 'Hỏi bác sĩ nếu có bệnh gan nặng',
    storage: 'Nơi khô, thoáng',
  },
  {
    name: 'Claritin',
    activeIngredient: 'Loratadine',
    group: 'Kháng histamine',
    indication: 'Giảm viêm mũi dị ứng, mề đay',
    usage: 'Uống theo hướng dẫn',
    caution: 'Không tự ý tăng liều khi triệu chứng chưa giảm',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Desloratadine',
    activeIngredient: 'Desloratadine',
    group: 'Kháng histamine',
    indication: 'Giảm triệu chứng dị ứng',
    usage: 'Uống theo chỉ dẫn',
    caution: 'Thận trọng nếu đang mang thai/cho con bú',
    storage: 'Tránh ánh sáng trực tiếp',
  },
  {
    name: 'Telfast',
    activeIngredient: 'Fexofenadine',
    group: 'Kháng histamine',
    indication: 'Giảm dị ứng, mề đay',
    usage: 'Uống với nước, theo hướng dẫn',
    caution: 'Tránh uống cùng nước trái cây nếu nhãn thuốc có khuyến cáo',
    storage: 'Nơi khô ráo',
  },
  {
    name: 'Pseudoephedrine',
    activeIngredient: 'Pseudoephedrine',
    group: 'Giảm nghẹt mũi',
    indication: 'Hỗ trợ giảm nghẹt mũi do cảm lạnh/dị ứng',
    usage: 'Dùng theo hướng dẫn',
    caution: 'Thận trọng với người tăng huyết áp, bệnh tim, cường giáp',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Xylometazoline Spray',
    activeIngredient: 'Xylometazoline',
    group: 'Xịt mũi',
    indication: 'Giảm nghẹt mũi tạm thời',
    usage: 'Xịt mũi theo hướng dẫn',
    caution: 'Không dùng kéo dài nhiều ngày liên tục để tránh nghẹt mũi hồi ứng',
    storage: 'Đậy nắp sau dùng',
  },
  {
    name: 'Naphazoline Eye Drops',
    activeIngredient: 'Naphazoline',
    group: 'Nhỏ mắt',
    indication: 'Giảm đỏ mắt tạm thời',
    usage: 'Nhỏ mắt theo hướng dẫn',
    caution: 'Không dùng nếu đau mắt nặng, nhìn mờ, nhiễm trùng mắt chưa khám',
    storage: 'Đậy kín, không chạm đầu lọ',
  },
  {
    name: 'Ambroxol',
    activeIngredient: 'Ambroxol',
    group: 'Long đờm',
    indication: 'Hỗ trợ làm loãng đờm, dễ khạc đờm',
    usage: 'Uống theo hướng dẫn',
    caution: 'Uống đủ nước; đi khám nếu ho kéo dài, sốt cao, khó thở',
    storage: 'Nơi khô, tránh ánh sáng',
  },
  {
    name: 'Mucosolvan',
    activeIngredient: 'Ambroxol',
    group: 'Long đờm',
    indication: 'Hỗ trợ giảm ho có đờm',
    usage: 'Uống theo hướng dẫn',
    caution: 'Không tự phối hợp nhiều thuốc ho nếu chưa hỏi dược sĩ',
    storage: 'Đậy kín chai/lọ',
  },
  {
    name: 'Bisolvon',
    activeIngredient: 'Bromhexine',
    group: 'Long đờm',
    indication: 'Làm loãng dịch tiết phế quản',
    usage: 'Uống theo hướng dẫn',
    caution: 'Thận trọng nếu có loét dạ dày hoặc ho kéo dài',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Dextromethorphan',
    activeIngredient: 'Dextromethorphan',
    group: 'Giảm ho',
    indication: 'Giảm ho khan, ho kích ứng',
    usage: 'Dùng theo nhãn thuốc',
    caution: 'Không dùng cho ho có nhiều đờm, khó thở hoặc nghi nhiễm khuẩn nếu chưa khám',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Acetylcysteine',
    activeIngredient: 'Acetylcysteine',
    group: 'Tiêu chất nhầy',
    indication: 'Hỗ trợ làm loãng đờm',
    usage: 'Hòa tan/uống theo dạng bào chế',
    caution: 'Có thể gây khó chịu tiêu hóa; thận trọng người hen',
    storage: 'Tránh ẩm, dùng ngay sau khi pha nếu là gói/viên sủi',
  },
  {
    name: 'Salbutamol / Albuterol Inhaler',
    activeIngredient: 'Salbutamol / Albuterol',
    group: 'Giãn phế quản',
    indication: 'Giảm co thắt phế quản, khò khè trong hen/COPD',
    usage: 'Hít theo đúng kỹ thuật và chỉ định',
    caution: 'Là thuốc cần tư vấn y tế; đi cấp cứu nếu khó thở không cải thiện',
    storage: 'Bảo quản bình xịt theo hướng dẫn, tránh nhiệt cao',
  },
  {
    name: 'Ventolin',
    activeIngredient: 'Salbutamol',
    group: 'Giãn phế quản',
    indication: 'Hỗ trợ cắt cơn khó thở do co thắt phế quản',
    usage: 'Dùng dạng hít theo chỉ định',
    caution: 'Không tự tăng số lần xịt; cần khám nếu phải dùng thường xuyên',
    storage: 'Tránh ánh nắng, không chọc thủng bình',
  },
  {
    name: 'Budesonide Inhaler',
    activeIngredient: 'Budesonide',
    group: 'Corticoid hít',
    indication: 'Kiểm soát viêm đường thở trong hen',
    usage: 'Dùng đều theo chỉ định',
    caution: 'Súc miệng sau khi hít để giảm nguy cơ nấm miệng',
    storage: 'Đậy nắp, tránh ẩm',
  },
  {
    name: 'Montelukast',
    activeIngredient: 'Montelukast',
    group: 'Kháng leukotriene',
    indication: 'Hỗ trợ kiểm soát hen/dị ứng theo chỉ định',
    usage: 'Uống theo đơn',
    caution: 'Theo dõi thay đổi tâm trạng/hành vi; không dùng để cắt cơn hen cấp',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Omeprazole',
    activeIngredient: 'Omeprazole',
    group: 'Ức chế bơm proton',
    indication: 'Giảm tiết acid dạ dày, GERD, viêm loét theo chỉ định',
    usage: 'Uống trước bữa ăn hoặc theo hướng dẫn',
    caution: 'Không tự dùng kéo dài nếu chưa có tư vấn; đi khám nếu đau bụng nặng, nôn máu, sụt cân',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Losec',
    activeIngredient: 'Omeprazole',
    group: 'Ức chế bơm proton',
    indication: 'Hỗ trợ điều trị trào ngược, đau dạ dày do acid',
    usage: 'Uống theo hướng dẫn',
    caution: 'Có thể tương tác với một số thuốc; hỏi dược sĩ nếu đang dùng thuốc khác',
    storage: 'Tránh ẩm',
  },
  {
    name: 'Esomeprazole / Nexium',
    activeIngredient: 'Esomeprazole',
    group: 'Ức chế bơm proton',
    indication: 'Giảm triệu chứng trào ngược dạ dày-thực quản',
    usage: 'Uống theo hướng dẫn',
    caution: 'Không tự ý dùng dài ngày',
    storage: 'Nơi khô ráo',
  },
  {
    name: 'Pantoprazole',
    activeIngredient: 'Pantoprazole',
    group: 'Ức chế bơm proton',
    indication: 'Giảm acid dạ dày',
    usage: 'Uống theo chỉ định',
    caution: 'Hỏi bác sĩ nếu triệu chứng kéo dài hoặc tái phát thường xuyên',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Gaviscon',
    activeIngredient: 'Sodium alginate + antacid',
    group: 'Chống trào ngược',
    indication: 'Giảm ợ nóng, trào ngược acid',
    usage: 'Uống sau ăn hoặc trước ngủ theo nhãn',
    caution: 'Người cần hạn chế natri nên hỏi dược sĩ/bác sĩ',
    storage: 'Đậy kín chai/gói',
  },
  {
    name: 'Phosphalugel',
    activeIngredient: 'Aluminium phosphate',
    group: 'Kháng acid',
    indication: 'Giảm khó chịu do tăng acid dạ dày',
    usage: 'Uống trực tiếp hoặc theo hướng dẫn',
    caution: 'Không lạm dụng kéo dài; thận trọng người bệnh thận',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Smecta',
    activeIngredient: 'Diosmectite',
    group: 'Tiêu chảy',
    indication: 'Hỗ trợ điều trị tiêu chảy, bảo vệ niêm mạc tiêu hóa',
    usage: 'Pha với nước theo hướng dẫn',
    caution: 'Uống cách xa thuốc khác để tránh giảm hấp thu',
    storage: 'Nơi khô ráo',
  },
  {
    name: 'Imodium',
    activeIngredient: 'Loperamide',
    group: 'Chống tiêu chảy',
    indication: 'Giảm tiêu chảy cấp không biến chứng',
    usage: 'Uống theo nhãn thuốc',
    caution: 'Không dùng khi tiêu chảy có sốt cao, phân máu; dùng quá liều có thể gây rối loạn nhịp tim nghiêm trọng',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Oresol / ORS',
    activeIngredient: 'Glucose + điện giải',
    group: 'Bù nước điện giải',
    indication: 'Bù nước, điện giải khi tiêu chảy/nôn',
    usage: 'Pha đúng lượng nước ghi trên gói, uống từng ngụm',
    caution: 'Không pha đặc hoặc loãng sai hướng dẫn',
    storage: 'Gói chưa pha để nơi khô; dung dịch đã pha dùng trong thời gian khuyến cáo',
  },
  {
    name: 'Enterogermina',
    activeIngredient: 'Bacillus clausii',
    group: 'Men vi sinh',
    indication: 'Hỗ trợ cân bằng hệ vi khuẩn đường ruột',
    usage: 'Uống theo hướng dẫn',
    caution: 'Không thay thế bù nước khi tiêu chảy mất nước',
    storage: 'Bảo quản theo nhãn, tránh nhiệt cao',
  },
  {
    name: 'Metformin',
    activeIngredient: 'Metformin hydrochloride',
    group: 'Đái tháo đường type 2',
    indication: 'Hỗ trợ kiểm soát đường huyết ở người đái tháo đường type 2',
    usage: 'Uống cùng bữa ăn theo chỉ định',
    caution: 'Thuốc kê đơn; cần theo dõi đường huyết, chức năng thận; không tự ý ngưng thuốc',
    storage: 'Nơi khô mát, tránh ẩm',
  },
  {
    name: 'Amlodipine',
    activeIngredient: 'Amlodipine',
    group: 'Hạ huyết áp',
    indication: 'Điều trị tăng huyết áp, đau thắt ngực theo chỉ định',
    usage: 'Uống đều hằng ngày theo đơn',
    caution: 'Không tự ý ngưng; theo dõi phù chân, chóng mặt, huyết áp thấp',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Losartan',
    activeIngredient: 'Losartan potassium',
    group: 'Hạ huyết áp',
    indication: 'Điều trị tăng huyết áp, bảo vệ thận trong một số trường hợp',
    usage: 'Uống theo chỉ định',
    caution: 'Không dùng khi mang thai; theo dõi kali máu/chức năng thận nếu được yêu cầu',
    storage: 'Nơi khô ráo',
  },
  {
    name: 'Atorvastatin',
    activeIngredient: 'Atorvastatin',
    group: 'Hạ lipid máu',
    indication: 'Giảm cholesterol, giảm nguy cơ biến cố tim mạch',
    usage: 'Uống theo chỉ định',
    caution: 'Báo bác sĩ nếu đau cơ bất thường, nước tiểu sẫm màu; tránh tự phối hợp thuốc',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Simvastatin',
    activeIngredient: 'Simvastatin',
    group: 'Hạ lipid máu',
    indication: 'Giảm cholesterol, giảm nguy cơ tim mạch',
    usage: 'Uống theo chỉ định',
    caution: 'Có nguy cơ tương tác thuốc; báo bác sĩ nếu đau cơ/yếu cơ',
    storage: 'Tránh ánh sáng, nơi khô',
  },
  {
    name: 'Amoxicillin',
    activeIngredient: 'Amoxicillin',
    group: 'Kháng sinh penicillin',
    indication: 'Điều trị nhiễm khuẩn do vi khuẩn nhạy cảm',
    usage: 'Chỉ dùng theo đơn; uống đủ liệu trình',
    caution: 'Không dùng nếu dị ứng penicillin; không dùng cho cảm cúm do virus',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Augmentin',
    activeIngredient: 'Amoxicillin + Clavulanic acid',
    group: 'Kháng sinh',
    indication: 'Điều trị một số nhiễm khuẩn theo chỉ định',
    usage: 'Dùng theo đơn bác sĩ',
    caution: 'Không tự ý ngừng sớm; báo dị ứng, tiêu chảy nặng',
    storage: 'Nơi khô mát; một số dạng hỗn dịch cần bảo quản lạnh sau pha',
  },
  {
    name: 'Azithromycin',
    activeIngredient: 'Azithromycin',
    group: 'Kháng sinh macrolide',
    indication: 'Điều trị một số nhiễm khuẩn theo đơn',
    usage: 'Uống theo đúng đơn',
    caution: 'Không tự mua dùng; thận trọng nếu có bệnh tim/rối loạn nhịp',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Cefixime',
    activeIngredient: 'Cefixime',
    group: 'Kháng sinh cephalosporin',
    indication: 'Điều trị nhiễm khuẩn nhạy cảm theo chỉ định',
    usage: 'Dùng theo đơn',
    caution: 'Báo tiền sử dị ứng beta-lactam; dùng đủ liệu trình',
    storage: 'Nơi khô ráo',
  },
  {
    name: 'Ciprofloxacin',
    activeIngredient: 'Ciprofloxacin',
    group: 'Kháng sinh quinolone',
    indication: 'Điều trị một số nhiễm khuẩn theo chỉ định',
    usage: 'Dùng theo đơn',
    caution: 'Thận trọng nguy cơ đau gân/viêm gân; tránh tự dùng',
    storage: 'Tránh ánh sáng, nơi khô',
  },
  {
    name: 'Doxycycline',
    activeIngredient: 'Doxycycline',
    group: 'Kháng sinh tetracycline',
    indication: 'Điều trị nhiễm khuẩn, mụn trứng cá, một số bệnh do ký sinh/trung gian truyền bệnh theo đơn',
    usage: 'Uống theo đơn, uống nhiều nước',
    caution: 'Có thể gây nhạy cảm ánh sáng; không tự dùng cho phụ nữ có thai/trẻ nhỏ nếu chưa được chỉ định',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Metronidazole',
    activeIngredient: 'Metronidazole',
    group: 'Kháng khuẩn/kháng đơn bào',
    indication: 'Điều trị nhiễm khuẩn kỵ khí, nhiễm đơn bào theo chỉ định',
    usage: 'Uống theo đơn',
    caution: 'Tránh rượu/bia trong thời gian dùng và theo hướng dẫn sau dùng; báo bác sĩ nếu tê bì, co giật, phát ban',
    storage: 'Nơi khô mát',
  },
  {
    name: 'Clotrimazole Cream',
    activeIngredient: 'Clotrimazole',
    group: 'Kháng nấm ngoài da',
    indication: 'Hỗ trợ điều trị nấm da, lang ben, nấm kẽ',
    usage: 'Bôi ngoài da theo hướng dẫn',
    caution: 'Chỉ dùng ngoài da; tránh mắt/niêm mạc; đi khám nếu lan rộng hoặc không cải thiện',
    storage: 'Đậy kín, tránh nhiệt',
  },
  {
    name: 'Povidone-Iodine',
    activeIngredient: 'Povidone iodine',
    group: 'Sát khuẩn ngoài da',
    indication: 'Sát khuẩn da, vết thương nhỏ',
    usage: 'Dùng ngoài da theo hướng dẫn',
    caution: 'Không dùng trên vết thương sâu/rộng nếu chưa được tư vấn; thận trọng bệnh tuyến giáp',
    storage: 'Đậy kín, tránh ánh sáng',
  },
];

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function simplifyName(name: string): string {
  return name
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRealProductSku(item: RealProductCatalogItem, index: number): string {
  const code = slugify(simplifyName(item.name)).replace(/-/g, '').toUpperCase().slice(0, 12) || 'PRODUCT';
  return `REAL-${String(index + 1).padStart(3, '0')}-${code}`;
}

export function buildRealProductSlug(item: RealProductCatalogItem, index: number): string {
  const base = slugify(simplifyName(item.name)) || `real-product-${index + 1}`;
  return `${base}-${String(index + 1).padStart(3, '0')}`;
}

export function inferCategoryName(item: RealProductCatalogItem): string {
  const text = `${item.group} ${item.name}`.toLowerCase();
  if (
    text.includes('gel') ||
    text.includes('cream') ||
    text.includes('xịt mũi') ||
    text.includes('nhỏ mắt') ||
    text.includes('sát khuẩn') ||
    text.includes('ngoài da')
  ) {
    return 'Chăm sóc cá nhân';
  }
  return 'Thuốc';
}

export function inferCategorySlug(item: RealProductCatalogItem): string {
  const categoryName = inferCategoryName(item);
  if (categoryName === 'Chăm sóc cá nhân') return 'personal-care';
  return 'medicine';
}

export function inferBrandName(item: RealProductCatalogItem): string {
  const normalized = simplifyName(item.name);
  const [head] = normalized.split(' ');
  return head || normalized;
}

export function inferBrandSlug(item: RealProductCatalogItem): string {
  return slugify(inferBrandName(item)) || 'general-pharma';
}

export function inferDosageForm(item: RealProductCatalogItem): string | null {
  const text = `${item.name} ${item.group}`.toLowerCase();
  if (text.includes('gel')) return 'Gel';
  if (text.includes('cream')) return 'Cream';
  if (text.includes('spray')) return 'Spray';
  if (text.includes('eye drops') || text.includes('nhỏ mắt')) return 'Eye Drops';
  if (text.includes('inhaler') || text.includes('hít')) return 'Inhaler';
  if (item.usage.toLowerCase().includes('thoa ngoài da')) return 'Topical';
  if (item.usage.toLowerCase().includes('pha với nước') || item.usage.toLowerCase().includes('hòa tan')) return 'Powder';
  return 'Tablet';
}

export function inferUnit(item: RealProductCatalogItem): string {
  const text = `${item.name} ${item.group} ${item.usage}`.toLowerCase();
  if (text.includes('gel') || text.includes('cream')) return 'tube';
  if (text.includes('spray') || text.includes('drops') || text.includes('chai') || text.includes('lọ')) return 'bottle';
  if (text.includes('inhaler') || text.includes('bình xịt')) return 'piece';
  if (text.includes('gói')) return 'pack';
  return 'box';
}

export function inferRequiresPrescription(item: RealProductCatalogItem): boolean {
  const text = `${item.name} ${item.group} ${item.indication} ${item.usage} ${item.caution}`.toLowerCase();
  return [
    'kháng sinh',
    'kê đơn',
    'theo đơn',
    'điều trị tăng huyết áp',
    'đái tháo đường',
    'hạ lipid máu',
    'corticoid hít',
    'kháng leukotriene',
    'giãn phế quản',
  ].some((keyword) => text.includes(keyword));
}

export function buildDescription(item: RealProductCatalogItem): string {
  return [
    item.indication,
    `Cách dùng: ${item.usage}.`,
    `Lưu ý: ${item.caution}.`,
    `Bảo quản: ${item.storage}.`,
  ].join(' ');
}
