// Curated examples from awesome-nanobanana-pro repository
// Source: https://github.com/ZeroLu/awesome-nanobanana-pro

export interface ShowcaseExample {
  id: string;
  image: string;
  prompt: string;
  promptZh: string;
  title: string;
}

export const SHOWCASE_EXAMPLES: ShowcaseExample[] = [
  {
    id: "1",
    image: "https://github.com/user-attachments/assets/3a056a8d-904e-4b3e-b0d2-b5122758b7f5",
    title: "超写实名人群像",
    prompt: "Create a hyper-realistic, ultra-sharp, full-color large-format image featuring a massive group of celebrities from different eras, all standing together in a single wide cinematic frame. Photorealistic, 8k, shallow depth of field, soft natural fill light + strong golden rim light.",
    promptZh: "创建一张超写实、超清晰的全彩大幅图像，展示来自不同时代的大量名人站在一起的宽幅电影画面。照片级写实，8k，浅景深，柔和自然补光+强烈金色轮廓光。"
  },
  {
    id: "2",
    image: "https://github.com/user-attachments/assets/b71755dc-ff33-4872-8161-3f5066e0ccb6",
    title: "2000年代镜子自拍",
    prompt: "A young woman taking a mirror selfie with very long voluminous dark waves and soft wispy bangs, early-2000s digital camera aesthetic, harsh super-flash with bright blown-out highlights, nostalgic early-2000s bedroom background.",
    promptZh: "一位年轻女性拍摄镜子自拍，长而蓬松的深色波浪卷发配柔和的刘海，2000年代早期数码相机美学，强烈闪光灯带来明亮的高光溢出效果，怀旧的2000年代卧室背景。"
  },
  {
    id: "3",
    image: "https://github.com/user-attachments/assets/963c0a46-cf86-4604-8782-524b94afc51d",
    title: "维密风格写真",
    prompt: "A glamorous photoshoot in the style of Victoria's Secret. A young woman stands almost sideways during the final preparation for the show. She is wearing a corset decorated with beaded embroidery and crystals with a short fluffy skirt, as well as large feather wings.",
    promptZh: "维多利亚的秘密风格的魅力写真。一位年轻女性在秀前最后准备时侧身站立。她穿着饰有珠绣和水晶的紧身胸衣配短蓬蓬裙，以及大型羽毛翅膀。"
  },
  {
    id: "4",
    image: "https://github.com/user-attachments/assets/eca5066b-1bf6-4a97-8b81-63e9e7435050",
    title: "90年代胶片人像",
    prompt: "Create a portrait of a beautiful young woman with porcelain-white skin, captured with a 1990s-style camera using a direct front flash. Her messy dark brown hair is tied up, posing with a calm yet playful smile. 35mm lens flash creates a nostalgic glow.",
    promptZh: "创建一位瓷白肌肤美丽年轻女性的肖像，使用1990年代风格相机正面闪光拍摄。她凌乱的深棕色头发扎起，带着平静而俏皮的微笑。35mm镜头闪光营造怀旧光晕。"
  },
  {
    id: "5",
    image: "https://github.com/user-attachments/assets/793ad242-7867-4709-bdc6-55021f5eb78f",
    title: "硅谷风商务照",
    prompt: "Professional profile photo, subject dressed in a professional navy blue business suit with a white shirt. Clean, solid dark gray studio photography backdrop. Shot on a Sony A7III with an 85mm f/1.4 lens, classic three-point lighting setup.",
    promptZh: "专业头像照片，主体穿着专业的海军蓝西装配白衬衫。干净的纯深灰色影棚背景。使用索尼A7III配85mm f/1.4镜头拍摄，经典三点布光。"
  },
  {
    id: "6",
    image: "https://github.com/user-attachments/assets/243d1b11-9ef0-4d4f-b308-97d67b5d3bc3",
    title: "柯达胶片情绪照",
    prompt: "A cinematic, emotional portrait shot on Kodak Portra 400 film. Setting: An urban street coffee shop window at Golden Hour. Warm, nostalgic lighting hitting the side of the face. Subtle film grain and soft focus to create a dreamy, storytelling vibe.",
    promptZh: "使用柯达Portra 400胶片拍摄的电影感情绪肖像。场景：黄金时段的城市街头咖啡店窗边。温暖怀旧的光线照在脸侧。微妙的胶片颗粒和柔焦营造梦幻叙事氛围。"
  },
  {
    id: "7",
    image: "https://github.com/user-attachments/assets/439317c2-4be8-4b28-803f-36427ecca31e",
    title: "星球大战寻找沃尔多",
    prompt: "A where is waldo image showing all Star Wars characters on Tatooine. Dense crowd composition with specific character recognition.",
    promptZh: "一张《寻找沃尔多》风格的图片，展示塔图因星球上的所有星球大战角色。密集人群构图，具有特定角色识别。"
  },
  {
    id: "8",
    image: "https://github.com/user-attachments/assets/74fced67-0715-46d3-b788-d9ed9e98873b",
    title: "岁月变迁",
    prompt: "Generate the holiday photo of this person through the ages up to 80 years old. Demonstrates temporal consistency and aging effects on a single subject.",
    promptZh: "生成这个人从年轻到80岁的节日照片。展示单一主体的时间一致性和衰老效果。"
  },
  {
    id: "9",
    image: "https://github.com/user-attachments/assets/f7ef5a84-e2bf-4d4e-a93e-38a23a21b9ef",
    title: "递归视觉",
    prompt: "Recursive image of an orange cat sitting in an office chair holding up an iPad. On the iPad is the same cat in the same scene holding up the same iPad. Repeated on each iPad.",
    promptZh: "一只橙色猫坐在办公椅上举着iPad的递归图像。iPad上是同一只猫在同一场景举着同一个iPad。在每个iPad上重复。"
  },
  {
    id: "10",
    image: "https://github.com/user-attachments/assets/8629b88a-b872-43e2-a19e-855542702ac2",
    title: "坐标可视化",
    prompt: "35.6586° N, 139.7454° E at 19:00. Generates a specific location and time based purely on latitude/longitude coordinates.",
    promptZh: "北纬35.6586°，东经139.7454°，19:00。纯粹基于经纬度坐标生成特定地点和时间的画面。"
  },
  {
    id: "11",
    image: "https://github.com/user-attachments/assets/761380fe-0850-49e2-8589-797f10b7cb8d",
    title: "工程师眼中的金门大桥",
    prompt: "How engineers see the San Francisco Bridge. Interpretative rendering of how a specific group visualizes a landmark.",
    promptZh: "工程师眼中的旧金山大桥。特定群体如何看待地标的诠释性渲染。"
  },
  {
    id: "12",
    image: "https://replicate.delivery/xezq/piAS0s9DshbqMFXJvIfw9feWaEaNsejlRifhVgMSflvZJzzaF/tmp3u2ym4f_.jpeg",
    title: "字面解读",
    prompt: "rare.jpg - Interprets a filename as a visual subject, creating a rare steak image.",
    promptZh: "rare.jpg - 将文件名解读为视觉主题，创建一张稀有牛排图像。"
  },
  {
    id: "13",
    image: "https://github.com/user-attachments/assets/54e2a2eb-1ab4-4f2b-86a2-7a59856e615f",
    title: "多人合成团队照",
    prompt: "An office team photo, everyone making a silly face. Combines multiple input portraits into a single cohesive group photo with a specific expression.",
    promptZh: "办公室团队照片，每个人都做鬼脸。将多个输入肖像合成为具有特定表情的单一连贯团体照。"
  },
  {
    id: "14",
    image: "https://github.com/user-attachments/assets/b399c4d9-151b-4e15-9a40-f092f7a892b9",
    title: "白板马克笔艺术",
    prompt: "Whiteboard marker art simulating specific drawing media (faded marker) on glass textures. Musashi warrior illustration style.",
    promptZh: "白板马克笔艺术，在玻璃纹理上模拟特定绘画媒介（褪色马克笔）。宫本武藏武士插画风格。"
  },
  {
    id: "15",
    image: "https://pbs.twimg.com/media/G6x00O_XIAASY0r?format=jpg&name=900x900",
    title: "专业头像生成器",
    prompt: "A professional, high-resolution profile photo maintaining the exact facial structure. Premium smart casual blazer in charcoal gray. Shot on an 85mm f/1.8 lens with shallow depth of field, exquisite focus on the eyes.",
    promptZh: "专业高分辨率头像照片，保持精确的面部结构。炭灰色高级休闲西装外套。使用85mm f/1.8镜头拍摄，浅景深，眼睛对焦精致。"
  },
  {
    id: "16",
    image: "https://pbs.twimg.com/media/G7Ah9SIbIAAGlyu?format=jpg&name=900x900",
    title: "聚光灯动漫肖像",
    prompt: "Generate a hyperrealistic anime portrait of a female character in completely black background. Use a narrow beam spotlight focused only on the center of the face. Long dark hair with strands falling over the face. Dark, moody, dramatic, mysterious.",
    promptZh: "生成一位女性角色在全黑背景下的超写实动漫肖像。使用窄光束聚光灯仅聚焦在脸部中心。长黑发有几缕垂落在脸上。黑暗、忧郁、戏剧性、神秘。"
  },
  {
    id: "17",
    image: "https://bibigpt-apps.chatvid.ai/chatimg/gemini-Bt055iW47OUqRDOh-K0gZ.png?v=1",
    title: "实物与手绘涂鸦广告",
    prompt: "Creative Ad with Real Object and Hand-Drawn Doodle. Combining physical products with playful hand-drawn illustrations for advertising.",
    promptZh: "实物与手绘涂鸦创意广告。将实物产品与俏皮的手绘插图结合用于广告。"
  },
  {
    id: "18",
    image: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/99/black-white-portrait-art.png",
    title: "黑白肖像艺术",
    prompt: "Black and White Portrait Art. High contrast monochrome portrait with dramatic lighting and artistic composition.",
    promptZh: "黑白肖像艺术。高对比度单色肖像，戏剧性光线和艺术构图。"
  },
  {
    id: "19",
    image: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/98/blurred-silhouette-frosted-glass.png",
    title: "磨砂玻璃后的模糊剪影",
    prompt: "Blurred Silhouette Behind Frosted Glass. Mysterious figure visible through textured glass with soft diffused lighting.",
    promptZh: "磨砂玻璃后的模糊剪影。透过纹理玻璃可见的神秘人物，柔和漫射光线。"
  },
  {
    id: "20",
    image: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/97/cute-cozy-knitted-doll.png",
    title: "可爱舒适针织娃娃",
    prompt: "Cute and Cozy Knitted Doll. Handcrafted aesthetic with warm textures and soft lighting.",
    promptZh: "可爱舒适的针织娃娃。手工美学，温暖纹理和柔和光线。"
  },
  {
    id: "21",
    image: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/90/branded-mechanical-keycaps.png",
    title: "品牌机械键帽",
    prompt: "Branded Mechanical Keycaps. Custom artisan keycaps with brand logos, detailed textures and studio lighting.",
    promptZh: "品牌机械键帽。带有品牌标志的定制工匠键帽，细节纹理和影棚灯光。"
  },
  {
    id: "22",
    image: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/72/gold-pendant-necklace.png",
    title: "金色吊坠项链",
    prompt: "A photorealistic close-up of a gold pendant necklace held by female hand. The pendant features a bas-relief engraving. Softly blurred neutral beige background, natural lighting, product photography, 16:9 aspect ratio.",
    promptZh: "女性手持金色吊坠项链的照片级写实特写。吊坠上有浮雕图案。柔和虚化的中性米色背景，自然光，产品摄影，16:9画幅。"
  },
  {
    id: "23",
    image: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/73/cute-chibi-keychain.png",
    title: "可爱Q版钥匙扣",
    prompt: "Cute Chibi Keychain. Adorable miniature character design with vibrant colors and glossy finish.",
    promptZh: "可爱Q版钥匙扣。可爱的迷你角色设计，鲜艳色彩和光泽表面。"
  },
  {
    id: "24",
    image: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/62/kawaii-enamel-pin.png",
    title: "卡哇伊珐琅徽章",
    prompt: "Kawaii Enamel Pin. Cute Japanese-style enamel pin design with pastel colors and gold metal outline.",
    promptZh: "卡哇伊珐琅徽章。可爱的日式珐琅徽章设计，粉彩色调和金色金属轮廓。"
  },
  // E-commerce Product Photography
  {
    id: "25",
    image: "https://github.com/user-attachments/assets/cdfd4934-d06a-48ee-bf28-58ce16c458c1",
    title: "专业产品摄影",
    prompt: "Identify the main product in the uploaded photo. Recreate it as a premium e-commerce product shot. Subject Isolation: Cleanly extract the product. Background: Place the product on a pure white studio background (RGB 255, 255, 255) with a subtle, natural contact shadow. Lighting: Use soft, commercial studio lighting to highlight the product's texture and material.",
    promptZh: "识别上传照片中的主要产品，将其重新创建为高端电商产品照片。主体隔离：干净地提取产品。背景：将产品放置在纯白色影棚背景上（RGB 255, 255, 255），带有微妙的自然接触阴影。灯光：使用柔和的商业影棚灯光突出产品的纹理和材质。"
  },
  {
    id: "26",
    image: "https://github.com/user-attachments/assets/81eaafb6-901b-424d-a197-dc1bc0bfc5bf",
    title: "虚拟模特试穿",
    prompt: "Using Image 1 (the garment) and Image 2 (the model), create a hyper-realistic full-body fashion photo where the model is wearing the garment. The garment must drape naturally on the model's body, conforming to their posture and creating realistic folds and wrinkles. Preserve the original fabric texture, color, and any logos with extreme accuracy.",
    promptZh: "使用图片1（服装）和图片2（模特），创建一张超写实的全身时尚照片，模特穿着该服装。服装必须自然地垂落在模特身上，符合其姿势并产生逼真的褶皱。极其精确地保留原始面料纹理、颜色和任何标志。"
  },
  {
    id: "27",
    image: "https://pbs.twimg.com/media/G7BWvI8X0AApeZB?format=jpg&name=900x900",
    title: "3D迷你品牌店铺",
    prompt: "3D chibi-style miniature concept store of {Brand Name}, creatively designed with an exterior inspired by the brand's most iconic product or packaging. The store features two floors with large glass windows clearly showcasing the cozy and finely decorated interior. Adorable tiny figures stroll or sit along the street, surrounded by benches, street lamps, and potted plants.",
    promptZh: "3D Q版迷你概念店铺，创意设计外观灵感来自品牌最具标志性的产品或包装。店铺有两层，大玻璃窗清晰展示舒适精致的内部装饰。可爱的小人物在街道上漫步或坐着，周围有长椅、路灯和盆栽植物。"
  },
  {
    id: "28",
    image: "https://github.com/user-attachments/assets/082f8bab-b098-4196-adf9-c6007a4b7006",
    title: "房间家具可视化",
    prompt: "Show me how this room would look with furniture in it. Visualize how furniture would look in an empty room with realistic lighting and shadows.",
    promptZh: "展示这个房间放入家具后的效果。用逼真的光线和阴影可视化家具在空房间中的样子。"
  },
  // Skincare & Cosmetics
  {
    id: "29",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
    title: "精华液滴管瓶",
    prompt: "Glass dropper bottle of serum, dew drops clinging to the glass, isolated on a pale teal-to-white gradient background, soft box lighting, commercial photography, extremely high detail.",
    promptZh: "玻璃滴管精华液瓶，露珠附着在玻璃上，隔离在淡青色到白色渐变背景上，柔光箱照明，商业摄影，极高细节。"
  },
  {
    id: "30",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400",
    title: "奢华口红特写",
    prompt: "A vibrant crimson lipstick tube, slightly open, casting a sharp shadow on a reflective black marble surface, shot with a 100mm macro lens, high-key studio lighting. Stunning product photography.",
    promptZh: "鲜艳的深红色口红管，微微打开，在反光的黑色大理石表面投下清晰的阴影，使用100mm微距镜头拍摄，高调影棚灯光。惊艳的产品摄影。"
  },
  {
    id: "31",
    image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400",
    title: "护肤品套装",
    prompt: "Luxury skincare set featuring serum bottles surrounded by flowing golden liquid. Glossy highlights, shallow depth of field, warm cinematic lighting. Premium product photography on marble surface.",
    promptZh: "奢华护肤套装，精华液瓶周围环绕流动的金色液体。光泽高光，浅景深，温暖的电影感灯光。大理石表面上的高端产品摄影。"
  },
  // Food & Beverage
  {
    id: "32",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
    title: "咖啡生活方式",
    prompt: "Create a cozy lifestyle coffee poster. A latte with foam art sits on a wooden table, lit by soft morning sunlight. Warm tones, subtle grain, steam rising from the cup.",
    promptZh: "创建一张温馨的咖啡生活方式海报。一杯带有拉花的拿铁放在木桌上，柔和的晨光照射。温暖色调，微妙颗粒感，蒸汽从杯中升起。"
  },
  {
    id: "33",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    title: "美食汉堡广告",
    prompt: "Design a premium food advertising poster showcasing a gourmet burger with dramatic side lighting. Crisp textures, steam effects, and 4K realism. Juicy patty, melted cheese, fresh vegetables.",
    promptZh: "设计一张高端美食广告海报，展示一个美食汉堡，配有戏剧性的侧光。清晰的纹理，蒸汽效果，4K写实。多汁的肉饼，融化的奶酪，新鲜蔬菜。"
  },
  {
    id: "34",
    image: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400",
    title: "夏日饮品广告",
    prompt: "Create a bright summer beverage advertising poster. A chilled glass bottle stands on a sandy beach with golden-hour lighting illuminating the condensation droplets. Refreshing and vibrant.",
    promptZh: "创建一张明亮的夏日饮品广告海报。一个冰镇玻璃瓶立在沙滩上，黄金时段的光线照亮凝结的水珠。清爽而充满活力。"
  },
  {
    id: "35",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    title: "能量饮料海报",
    prompt: "Create a bold energy drink advertising poster. A metallic can stands in the center with electric blue and neon orange lighting. Dynamic liquid splash effects, powerful and energetic.",
    promptZh: "创建一张大胆的能量饮料广告海报。金属罐立在中央，配有电蓝色和霓虹橙色灯光。动态液体飞溅效果，强劲而充满能量。"
  },
  // Electronics & Tech
  {
    id: "36",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
    title: "无线耳机广告",
    prompt: "Create a minimalist tech poster showing white wireless earbuds floating against a smooth gradient background. Soft rim lighting, subtle shadows, clean and modern aesthetic.",
    promptZh: "创建一张极简科技海报，展示白色无线耳机漂浮在平滑渐变背景上。柔和的轮廓光，微妙的阴影，干净现代的美学。"
  },
  {
    id: "37",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400",
    title: "便携音箱产品照",
    prompt: "Brushed aluminum portable speaker, isolated, casting a subtle shadow, photorealistic, shot with a Canon R5. Clean white background, professional product photography.",
    promptZh: "拉丝铝便携音箱，隔离拍摄，投下微妙阴影，照片级写实，使用佳能R5拍摄。干净的白色背景，专业产品摄影。"
  },
  {
    id: "38",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    title: "智能手表展示",
    prompt: "Premium smartwatch on a minimalist display stand, soft studio lighting highlighting the screen and metal band. Clean background, luxury product photography, 8K detail.",
    promptZh: "高端智能手表放在极简展示架上，柔和的影棚灯光突出屏幕和金属表带。干净背景，奢华产品摄影，8K细节。"
  },
  // Fashion & Accessories
  {
    id: "39",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400",
    title: "运动鞋产品照",
    prompt: "Isolate the sneaker on a clean glass-top surface, reflect it subtly, and bathe the scene in cool morning light. Professional footwear photography, sharp details, floating effect.",
    promptZh: "将运动鞋隔离在干净的玻璃台面上，微妙地反射，用清凉的晨光沐浴整个场景。专业鞋类摄影，清晰细节，悬浮效果。"
  },
  {
    id: "40",
    image: "https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400",
    title: "奢华手提包",
    prompt: "Luxury leather handbag on a marble pedestal, soft directional lighting creating elegant shadows. High-end fashion photography, rich textures, premium brand aesthetic.",
    promptZh: "奢华皮革手提包放在大理石底座上，柔和的定向光线创造优雅的阴影。高端时尚摄影，丰富纹理，高端品牌美学。"
  },
  // Jewelry
  {
    id: "41",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
    title: "钻石戒指特写",
    prompt: "Diamond solitaire ring on a bed of dark, volcanic rock, sharp spotlight from above, macro photography, extremely reflective surfaces, cinematic noir lighting.",
    promptZh: "钻石单石戒指放在深色火山岩上，从上方打下锐利的聚光灯，微距摄影，极度反光的表面，电影黑色风格灯光。"
  },
  {
    id: "42",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
    title: "珍珠耳环展示",
    prompt: "Elegant pearl drop earrings displayed on a velvet cushion, soft diffused lighting, luxury jewelry photography. Creamy white pearls with subtle iridescence.",
    promptZh: "优雅的珍珠耳坠展示在天鹅绒垫子上，柔和的漫射光，奢华珠宝摄影。乳白色珍珠带有微妙的虹彩。"
  },
  // Fragrance
  {
    id: "43",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400",
    title: "香水瓶日落广告",
    prompt: "Create a high-end perfume advertisement. A transparent glass bottle is illuminated by warm sunset backlight with soft flares and elegant shadows. Luxury fragrance photography.",
    promptZh: "创建一张高端香水广告。透明玻璃瓶被温暖的日落逆光照亮，带有柔和的光晕和优雅的阴影。奢华香水摄影。"
  },
  {
    id: "44",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400",
    title: "琥珀香水瓶",
    prompt: "Square bottle of amber perfume, mist gently floating around the base, high-contrast chiaroscuro lighting, black reflective surface. Dramatic fragrance product shot.",
    promptZh: "方形琥珀香水瓶，薄雾轻轻漂浮在底部周围，高对比度明暗对比灯光，黑色反光表面。戏剧性的香水产品照。"
  },
  // Home & Lifestyle
  {
    id: "45",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    title: "露营灯具海报",
    prompt: "Create an outdoor camping poster featuring a warm-lit lantern on a wooden table during blue hour. Soft depth, cozy atmosphere, subtle mountain silhouettes in background.",
    promptZh: "创建一张户外露营海报，展示蓝色时刻木桌上温暖照明的灯笼。柔和的景深，温馨的氛围，背景中微妙的山脉轮廓。"
  },
  {
    id: "46",
    image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400",
    title: "香薰蜡烛氛围",
    prompt: "Luxury scented candle in a minimalist ceramic holder, soft warm glow, wisps of smoke rising. Cozy home atmosphere, lifestyle product photography.",
    promptZh: "奢华香薰蜡烛放在极简陶瓷烛台中，柔和温暖的光芒，缕缕烟雾升起。温馨的家居氛围，生活方式产品摄影。"
  },
  // Artisan Food
  {
    id: "47",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    title: "手工面包摄影",
    prompt: "Perfectly baked artisanal sourdough loaf resting on a rustic wooden cutting board, scattered flour, deep, warm kitchen lighting, soft cinematic bokeh.",
    promptZh: "完美烘焙的手工酸面包放在质朴的木砧板上，散落的面粉，深沉温暖的厨房灯光，柔和的电影感散景。"
  },
  {
    id: "48",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400",
    title: "巧克力甜点展示",
    prompt: "Gourmet chocolate dessert with gold leaf decoration, dark moody lighting, premium food photography. Rich textures, glossy chocolate ganache, artistic plating.",
    promptZh: "带有金箔装饰的美食巧克力甜点，深色情绪灯光，高端美食摄影。丰富的纹理，光泽的巧克力甘纳许，艺术摆盘。"
  },
  // More E-commerce Products
  {
    id: "49",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    title: "悬浮运动鞋",
    prompt: "Red Nike sneaker floating in mid-air against a gradient pink background, dramatic studio lighting, product levitation photography, sharp focus on shoe details.",
    promptZh: "红色耐克运动鞋悬浮在渐变粉色背景中，戏剧性影棚灯光，产品悬浮摄影，鞋子细节清晰对焦。"
  },
  {
    id: "50",
    image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400",
    title: "护肤品平铺",
    prompt: "Flat lay of luxury skincare products on marble surface, soft natural lighting, minimalist composition, premium beauty photography with gold accents.",
    promptZh: "奢华护肤品在大理石表面的平铺摆放，柔和自然光，极简构图，带有金色点缀的高端美妆摄影。"
  },
  {
    id: "51",
    image: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400",
    title: "高跟鞋特写",
    prompt: "Elegant stiletto heel on reflective surface, dramatic side lighting creating long shadows, luxury fashion photography, glossy patent leather texture.",
    promptZh: "优雅的细高跟鞋在反光表面上，戏剧性侧光创造长阴影，奢华时尚摄影，光泽漆皮纹理。"
  },
  {
    id: "52",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400",
    title: "无线耳机悬浮",
    prompt: "White wireless headphones floating against dark background, neon accent lighting, tech product photography, futuristic aesthetic with soft glow.",
    promptZh: "白色无线耳机悬浮在深色背景上，霓虹点缀灯光，科技产品摄影，带有柔和光晕的未来感美学。"
  },
  {
    id: "53",
    image: "https://images.unsplash.com/photo-1522273400909-fd1a8f77637e?w=400",
    title: "相机装备展示",
    prompt: "Professional DSLR camera with lens on dark wooden surface, dramatic spotlight, tech gear photography, sharp details on camera body texture.",
    promptZh: "专业单反相机配镜头放在深色木质表面上，戏剧性聚光灯，科技装备摄影，相机机身纹理细节清晰。"
  },
  {
    id: "54",
    image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400",
    title: "皮革钱包特写",
    prompt: "Premium leather wallet on dark slate surface, warm directional lighting, luxury accessories photography, rich brown leather grain texture visible.",
    promptZh: "高端皮革钱包放在深色石板表面上，温暖的定向光线，奢华配饰摄影，丰富的棕色皮革纹理清晰可见。"
  },
  {
    id: "55",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400",
    title: "眼镜产品照",
    prompt: "Designer sunglasses on white pedestal, clean studio lighting, fashion accessories photography, reflective lens with subtle color gradient.",
    promptZh: "设计师太阳镜放在白色底座上，干净的影棚灯光，时尚配饰摄影，反光镜片带有微妙的颜色渐变。"
  },
  {
    id: "56",
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400",
    title: "红酒瓶广告",
    prompt: "Elegant wine bottle with dramatic rim lighting against dark background, luxury beverage photography, glass reflections and deep red wine color visible.",
    promptZh: "优雅的红酒瓶在深色背景上配有戏剧性轮廓光，奢华饮品摄影，玻璃反射和深红色酒液清晰可见。"
  },
  {
    id: "57",
    image: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=400",
    title: "金色手表特写",
    prompt: "Luxury gold watch on black velvet, macro photography showing intricate dial details, premium timepiece photography with soft bokeh background.",
    promptZh: "奢华金表放在黑色天鹅绒上，微距摄影展示精致表盘细节，高端腕表摄影配柔和散景背景。"
  },
  {
    id: "58",
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400",
    title: "护手霜产品照",
    prompt: "Minimalist hand cream tube on pastel background with fresh flowers, soft natural lighting, clean beauty product photography, spa aesthetic.",
    promptZh: "极简护手霜管放在粉彩背景上配鲜花，柔和自然光，干净的美妆产品摄影，水疗美学。"
  },
  {
    id: "59",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
    title: "化妆品套装",
    prompt: "Makeup palette and brushes arranged artistically on marble surface, overhead shot, beauty product flat lay, warm golden lighting.",
    promptZh: "化妆盘和刷子在大理石表面上艺术排列，俯拍，美妆产品平铺，温暖的金色灯光。"
  },
  {
    id: "60",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400",
    title: "彩色运动鞋",
    prompt: "Colorful sneakers arranged in a row against vibrant gradient background, pop art style product photography, bold colors and sharp shadows.",
    promptZh: "彩色运动鞋排成一排，配有鲜艳的渐变背景，波普艺术风格产品摄影，大胆的色彩和清晰的阴影。"
  },
  {
    id: "61",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400",
    title: "宝丽来相机",
    prompt: "Vintage Polaroid camera on wooden surface with scattered photos, nostalgic lifestyle photography, warm afternoon lighting, retro aesthetic.",
    promptZh: "复古宝丽来相机放在木质表面上，周围散落着照片，怀旧生活方式摄影，温暖的午后光线，复古美学。"
  },
  {
    id: "62",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400",
    title: "香薰精油瓶",
    prompt: "Essential oil bottles with dried lavender on linen cloth, soft diffused lighting, wellness product photography, calming spa atmosphere.",
    promptZh: "精油瓶配干薰衣草放在亚麻布上，柔和的漫射光，健康产品摄影，宁静的水疗氛围。"
  },
  {
    id: "63",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400",
    title: "白色运动鞋",
    prompt: "Clean white sneakers on minimalist background, soft studio lighting, footwear product photography, pristine condition with subtle shadows.",
    promptZh: "干净的白色运动鞋在极简背景上，柔和的影棚灯光，鞋类产品摄影，完美状态配微妙阴影。"
  },
  {
    id: "64",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
    title: "太阳镜广告",
    prompt: "Stylish sunglasses floating with colorful light reflections, creative product photography, fashion accessories with artistic lighting effects.",
    promptZh: "时尚太阳镜悬浮着，带有彩色光线反射，创意产品摄影，时尚配饰配艺术灯光效果。"
  },
  {
    id: "65",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
    title: "皮革背包",
    prompt: "Vintage leather backpack on rustic wooden floor, warm natural lighting from window, lifestyle product photography, adventure travel aesthetic.",
    promptZh: "复古皮革背包放在质朴的木地板上，窗户透入温暖的自然光，生活方式产品摄影，冒险旅行美学。"
  },
  {
    id: "66",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
    title: "帆布托特包",
    prompt: "Canvas tote bag with minimalist design on clean white background, soft even lighting, e-commerce product photography, simple and elegant.",
    promptZh: "极简设计的帆布托特包在干净的白色背景上，柔和均匀的灯光，电商产品摄影，简约而优雅。"
  },
  {
    id: "67",
    image: "https://images.unsplash.com/photo-1491553895911-0055uj8d0?w=400",
    title: "机械键盘",
    prompt: "RGB mechanical keyboard with colorful backlighting in dark room, tech product photography, gaming aesthetic with neon glow effects.",
    promptZh: "RGB机械键盘在暗室中带有彩色背光，科技产品摄影，带有霓虹光效的游戏美学。"
  },
  {
    id: "68",
    image: "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400",
    title: "AirPods耳机",
    prompt: "Apple AirPods on clean white surface with soft shadows, minimalist tech product photography, premium consumer electronics aesthetic.",
    promptZh: "苹果AirPods放在干净的白色表面上配柔和阴影，极简科技产品摄影，高端消费电子美学。"
  },
  {
    id: "69",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400",
    title: "游戏手柄",
    prompt: "Gaming controller with dramatic colored lighting, tech product photography, esports aesthetic with dynamic light trails.",
    promptZh: "游戏手柄配戏剧性彩色灯光，科技产品摄影，带有动态光轨的电竞美学。"
  },
  {
    id: "70",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400",
    title: "智能手机展示",
    prompt: "Modern smartphone on gradient background with screen glow, tech product photography, sleek design with reflective surface.",
    promptZh: "现代智能手机在渐变背景上带有屏幕光晕，科技产品摄影，流线型设计配反光表面。"
  },
  {
    id: "71",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400",
    title: "笔记本文具",
    prompt: "Leather notebook with pen on wooden desk, warm afternoon lighting, stationery product photography, professional workspace aesthetic.",
    promptZh: "皮革笔记本配钢笔放在木桌上，温暖的午后光线，文具产品摄影，专业工作空间美学。"
  },
  {
    id: "72",
    image: "https://images.unsplash.com/photo-1583209814683-c023dd293cc6?w=400",
    title: "运动水壶",
    prompt: "Stainless steel water bottle on gym floor with towel, fitness product photography, active lifestyle aesthetic with natural lighting.",
    promptZh: "不锈钢水壶放在健身房地板上配毛巾，健身产品摄影，带有自然光的活力生活方式美学。"
  },
  {
    id: "73",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
    title: "粉底液广告",
    prompt: "Foundation bottle with liquid splash effect, beauty product photography, dynamic cosmetics advertising with creamy texture visible.",
    promptZh: "粉底液瓶配液体飞溅效果，美妆产品摄影，动态化妆品广告，奶油质地清晰可见。"
  },
  {
    id: "74",
    image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400",
    title: "马卡龙甜点",
    prompt: "Colorful French macarons stacked elegantly on marble surface, pastel colors, premium dessert photography with soft natural lighting.",
    promptZh: "彩色法式马卡龙优雅地堆叠在大理石表面上，粉彩色调，高端甜点摄影配柔和自然光。"
  },
  {
    id: "75",
    image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400",
    title: "甜甜圈广告",
    prompt: "Glazed donuts with colorful sprinkles on pink background, fun food photography, playful dessert advertising with vibrant colors.",
    promptZh: "糖霜甜甜圈配彩色糖粒在粉色背景上，有趣的美食摄影，活泼的甜点广告配鲜艳色彩。"
  },
  {
    id: "76",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
    title: "咖啡杯特写",
    prompt: "Latte art in ceramic cup on wooden table, overhead shot, coffee shop aesthetic, warm morning lighting with steam rising.",
    promptZh: "陶瓷杯中的拉花艺术放在木桌上，俯拍，咖啡店美学，温暖的晨光配升腾的蒸汽。"
  },
  {
    id: "77",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400",
    title: "披萨美食照",
    prompt: "Fresh pizza with melted cheese pull shot, dramatic food photography, appetizing with steam and golden crust visible.",
    promptZh: "新鲜披萨配融化奶酪拉丝镜头，戏剧性美食摄影，诱人的蒸汽和金黄酥皮清晰可见。"
  },
  {
    id: "78",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    title: "意大利面广告",
    prompt: "Gourmet pasta dish with fresh herbs and parmesan, restaurant food photography, warm lighting with shallow depth of field.",
    promptZh: "美食意大利面配新鲜香草和帕玛森奶酪，餐厅美食摄影，温暖灯光配浅景深。"
  },
  {
    id: "79",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    title: "健康沙拉",
    prompt: "Fresh colorful salad bowl with vegetables, healthy food photography, bright natural lighting, clean eating aesthetic.",
    promptZh: "新鲜彩色沙拉碗配蔬菜，健康美食摄影，明亮的自然光，清洁饮食美学。"
  },
  {
    id: "80",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
    title: "早餐煎饼",
    prompt: "Stack of fluffy pancakes with maple syrup drizzle, breakfast food photography, warm golden lighting, comfort food aesthetic.",
    promptZh: "蓬松煎饼堆配枫糖浆淋洒，早餐美食摄影，温暖的金色灯光，舒适食物美学。"
  },
  {
    id: "81",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400",
    title: "寿司拼盘",
    prompt: "Premium sushi platter on black slate, Japanese cuisine photography, elegant presentation with wasabi and ginger garnish.",
    promptZh: "高端寿司拼盘放在黑色石板上，日本料理摄影，优雅的摆盘配芥末和姜片装饰。"
  },
  {
    id: "82",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
    title: "牛排大餐",
    prompt: "Perfectly grilled steak with herbs on wooden board, premium meat photography, dramatic lighting with sizzling effect.",
    promptZh: "完美烤制的牛排配香草放在木板上，高端肉类摄影，戏剧性灯光配滋滋作响的效果。"
  },
  {
    id: "83",
    image: "https://images.unsplash.com/photo-1482049016gy-2d1ec7ab7445?w=400",
    title: "冰淇淋广告",
    prompt: "Colorful ice cream scoops in waffle cone, summer dessert photography, bright cheerful lighting with melting drips.",
    promptZh: "彩色冰淇淋球放在华夫蛋筒中，夏日甜点摄影，明亮欢快的灯光配融化的滴落。"
  },
  {
    id: "84",
    image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400",
    title: "新鲜水果",
    prompt: "Fresh fruits arrangement with water droplets, healthy food photography, vibrant colors on white background, farm fresh aesthetic.",
    promptZh: "新鲜水果排列配水珠，健康美食摄影，白色背景上的鲜艳色彩，农场新鲜美学。"
  },
  {
    id: "85",
    image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400",
    title: "奶茶饮品",
    prompt: "Bubble tea with tapioca pearls in clear cup, beverage photography, colorful gradient background, trendy drink aesthetic.",
    promptZh: "珍珠奶茶配木薯珍珠在透明杯中，饮品摄影，彩色渐变背景，潮流饮品美学。"
  },
  {
    id: "86",
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400",
    title: "蛋糕切片",
    prompt: "Layered chocolate cake slice on white plate, dessert photography, rich textures with chocolate drizzle, indulgent aesthetic.",
    promptZh: "分层巧克力蛋糕切片放在白色盘子上，甜点摄影，丰富的纹理配巧克力淋酱，奢华美学。"
  },
  {
    id: "87",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
    title: "健身器材",
    prompt: "Dumbbells and fitness equipment on gym floor, sports product photography, motivational fitness aesthetic with dramatic lighting.",
    promptZh: "哑铃和健身器材放在健身房地板上，运动产品摄影，带有戏剧性灯光的励志健身美学。"
  },
  {
    id: "88",
    image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400",
    title: "篮球鞋广告",
    prompt: "Basketball sneakers with dynamic action pose, sports footwear photography, energetic lighting with motion blur effect.",
    promptZh: "篮球鞋配动态动作姿势，运动鞋类摄影，充满活力的灯光配运动模糊效果。"
  },
  {
    id: "89",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400",
    title: "瑜伽垫展示",
    prompt: "Yoga mat rolled up with props on wooden floor, wellness product photography, calm zen aesthetic with soft natural lighting.",
    promptZh: "瑜伽垫卷起配道具放在木地板上，健康产品摄影，带有柔和自然光的宁静禅意美学。"
  },
  {
    id: "90",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
    title: "眼影盘特写",
    prompt: "Eyeshadow palette with shimmer colors, beauty product macro photography, detailed texture with soft studio lighting.",
    promptZh: "眼影盘配闪光色彩，美妆产品微距摄影，柔和影棚灯光下的细节纹理。"
  },
];

// Fisher-Yates shuffle algorithm for randomizing array
export function shuffleExamples(array: ShowcaseExample[]): ShowcaseExample[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get randomized examples
export function getRandomizedExamples(): ShowcaseExample[] {
  return shuffleExamples(SHOWCASE_EXAMPLES);
}
