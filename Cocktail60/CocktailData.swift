import Foundation

enum CocktailData {
    static let allFilter = "全部"
    static let favoritesFilter = "收藏"
    static let userFilter = "我的"
    static let baseFilters = ["金酒", "伏特加", "朗姆", "龙舌兰", "威士忌", "百利甜"]
    static let filterTags = [allFilter, favoritesFilter, userFilter, "世界经典"] + baseFilters + ["白兰地", "咖啡", "奶油", "酸爽", "长饮", "起泡", "利口酒"]
    static let footerNote = "“补满”通常指按杯型加入约 120 到 180 ml 辅料。百利甜类不建议与大量酸性果汁直接混合。"

    static let recipes: [CocktailRecipe] = [
        r(
            "vesper-style",
            "Vesper Style",
            "维斯帕风格版",
            ["金酒 45 ml", "伏特加 15 ml", "柠檬皮可选"],
            tags: ["金酒", "伏特加"],
            glass: "鸡尾酒杯",
            method: "加冰搅拌后滤入冰镇杯",
            note: "偏烈、干净，适合慢慢啜饮。",
            accent: "#7895B2"
        ),
        r(
            "silver-bullet",
            "Silver Bullet",
            "银色子弹",
            ["金酒 40 ml", "威士忌 20 ml", "柠檬皮可选"],
            tags: ["金酒", "威士忌"],
            glass: "岩石杯",
            method: "加冰搅拌后滤入杯中",
            accent: "#7D8E95"
        ),
        r(
            "suffering-bastard-variation",
            "Suffering Bastard Variation",
            "苦难混蛋变体版",
            ["金酒 30 ml", "威士忌 30 ml", "青柠汁 15 ml", "苦精 2 滴可选", "姜汁汽水补满"],
            tags: ["金酒", "威士忌", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前四项加冰摇匀，倒入杯中后补姜汁汽水",
            accent: "#6C9A8B"
        ),
        r(
            "brass-monkey",
            "Brass Monkey",
            "铜猴",
            ["伏特加 30 ml", "朗姆 30 ml", "橙汁 120 ml"],
            tags: ["伏特加", "朗姆", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#D18B48"
        ),
        r(
            "acapulco-cocktail",
            "Acapulco Cocktail",
            "阿卡普尔科鸡尾酒",
            ["龙舌兰 30 ml", "朗姆 30 ml", "菠萝汁 60 ml", "西柚汁 40 ml", "青柠汁 15 ml", "糖浆 10 ml"],
            tags: ["龙舌兰", "朗姆", "酸爽"],
            glass: "飓风杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#E0A64F"
        ),
        r(
            "baileys-white-russian",
            "Baileys White Russian",
            "百利甜白俄罗斯",
            ["百利甜 45 ml", "伏特加 20 ml", "牛奶 60 ml"],
            tags: ["百利甜", "伏特加", "奶油"],
            glass: "岩石杯",
            method: "杯中加冰轻轻搅匀",
            accent: "#9B6B5D"
        ),
        r(
            "baileys-flat-white-martini",
            "Baileys Flat White Martini",
            "百利甜馥芮白马天尼",
            ["百利甜 50 ml", "伏特加 25 ml", "冷浓缩咖啡 30 到 60 ml"],
            tags: ["百利甜", "伏特加", "咖啡", "奶油"],
            glass: "马天尼杯",
            method: "加冰充分摇匀后滤入杯中",
            accent: "#7A584E"
        ),
        r(
            "baileys-espresso-martini",
            "Baileys Espresso Martini",
            "百利甜浓缩咖啡马天尼",
            ["百利甜 30 ml", "伏特加 30 ml", "浓缩咖啡 30 ml", "糖浆 5 到 10 ml"],
            tags: ["百利甜", "伏特加", "咖啡", "奶油"],
            glass: "马天尼杯",
            method: "加冰大力摇匀后滤入杯中",
            accent: "#73564A"
        ),
        r(
            "mudslide-style",
            "Mudslide Style",
            "泥石流风格版",
            ["百利甜 45 ml", "伏特加 25 ml", "牛奶 60 ml", "咖啡 30 ml 可选"],
            tags: ["百利甜", "伏特加", "咖啡", "奶油"],
            glass: "岩石杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#8E6258"
        ),
        r(
            "baileys-irish-coffee-style",
            "Baileys Irish Coffee Style",
            "百利甜爱尔兰咖啡风格版",
            ["百利甜 30 ml", "威士忌 30 ml", "热咖啡 120 ml"],
            tags: ["百利甜", "威士忌", "咖啡", "奶油"],
            glass: "热饮杯",
            method: "热咖啡中加入酒液后轻轻搅匀",
            accent: "#A06B4D"
        ),
        r(
            "baileys-whisky-cream",
            "Baileys Whisky Cream",
            "百利甜威士忌奶油",
            ["百利甜 45 ml", "威士忌 25 ml", "牛奶 80 ml"],
            tags: ["百利甜", "威士忌", "奶油"],
            glass: "岩石杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#A46C59"
        ),
        r(
            "baileys-rum-cream",
            "Baileys Rum Cream",
            "百利甜朗姆奶油",
            ["百利甜 45 ml", "朗姆 25 ml", "牛奶 80 ml"],
            tags: ["百利甜", "朗姆", "奶油"],
            glass: "岩石杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#B07855"
        ),
        r(
            "tequila-rum-sour",
            "Tequila Rum Sour",
            "龙舌兰朗姆酸",
            ["龙舌兰 30 ml", "朗姆 30 ml", "青柠汁 25 ml", "糖浆 15 ml"],
            tags: ["龙舌兰", "朗姆", "酸爽"],
            glass: "酸酒杯",
            method: "加冰摇匀后滤入杯中",
            accent: "#D09058"
        ),
        r(
            "gin-rum-collins",
            "Gin Rum Collins",
            "金酒朗姆柯林斯",
            ["金酒 25 ml", "朗姆 25 ml", "柠檬汁 25 ml", "糖浆 15 ml", "苏打水补满"],
            tags: ["金酒", "朗姆", "酸爽", "长饮"],
            glass: "柯林斯杯",
            method: "前四项加冰摇匀，入杯后补苏打水",
            accent: "#6FAE9A"
        ),
        r(
            "vodka-tequila-highball",
            "Vodka Tequila Highball",
            "伏特加龙舌兰高球",
            ["伏特加 25 ml", "龙舌兰 25 ml", "青柠汁 10 ml", "苏打水补满"],
            tags: ["伏特加", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，最后补苏打水",
            accent: "#7FA6BD"
        ),
        r(
            "rum-whisky-cola",
            "Rum Whisky Cola",
            "朗姆威士忌可乐",
            ["朗姆 25 ml", "威士忌 25 ml", "可乐补满"],
            tags: ["朗姆", "威士忌", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#9B5F43"
        ),
        r(
            "gin-tequila-tonic",
            "Gin Tequila Tonic",
            "金酒龙舌兰汤力",
            ["金酒 25 ml", "龙舌兰 25 ml", "汤力水补满", "青柠片"],
            tags: ["金酒", "龙舌兰", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，青柠片装饰",
            accent: "#8CA66E"
        ),
        r(
            "vodka-rum-lime",
            "Vodka Rum Lime",
            "伏特加朗姆青柠",
            ["伏特加 25 ml", "朗姆 25 ml", "青柠汁 20 ml", "糖浆 15 ml", "苏打水补满"],
            tags: ["伏特加", "朗姆", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前四项加冰摇匀，倒入杯中后补苏打水",
            accent: "#79A9A0"
        ),
        r(
            "whisky-tequila-ginger",
            "Whisky Tequila Ginger",
            "威士忌龙舌兰姜汁",
            ["威士忌 25 ml", "龙舌兰 25 ml", "青柠汁 10 ml", "姜汁汽水补满"],
            tags: ["威士忌", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，最后补姜汁汽水",
            accent: "#BC7B4A"
        ),
        r(
            "gin-vodka-cranberry",
            "Gin Vodka Cranberry",
            "金酒伏特加蔓越莓",
            ["金酒 25 ml", "伏特加 25 ml", "蔓越莓汁 120 ml", "青柠汁 5 ml"],
            tags: ["金酒", "伏特加", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#B85C7A"
        ),
        r(
            "three-wise-men-style",
            "Three Wise Men Style",
            "三贤者风格版",
            ["威士忌 20 ml", "龙舌兰 20 ml", "朗姆 20 ml"],
            tags: ["威士忌", "龙舌兰", "朗姆"],
            glass: "烈酒杯",
            method: "冰镇后直接调和",
            note: "酒感直接，适合小份量饮用。",
            accent: "#A76546"
        ),
        r(
            "creamy-three-wise-men",
            "Creamy Three Wise Men",
            "奶油三贤者",
            ["威士忌 20 ml", "龙舌兰 15 ml", "朗姆 15 ml", "百利甜 30 ml"],
            tags: ["威士忌", "龙舌兰", "朗姆", "百利甜", "奶油"],
            glass: "岩石杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#A56A5C"
        ),
        r(
            "gin-vodka-rum-sour",
            "Gin Vodka Rum Sour",
            "金酒伏特加朗姆酸",
            ["金酒 20 ml", "伏特加 20 ml", "朗姆 20 ml", "柠檬汁 25 ml", "糖浆 15 ml"],
            tags: ["金酒", "伏特加", "朗姆", "酸爽"],
            glass: "酸酒杯",
            method: "加冰摇匀后滤入杯中",
            accent: "#7AA6A4"
        ),
        r(
            "gin-vodka-tequila-sour",
            "Gin Vodka Tequila Sour",
            "金酒伏特加龙舌兰酸",
            ["金酒 20 ml", "伏特加 20 ml", "龙舌兰 20 ml", "青柠汁 25 ml", "糖浆 15 ml"],
            tags: ["金酒", "伏特加", "龙舌兰", "酸爽"],
            glass: "酸酒杯",
            method: "加冰摇匀后滤入杯中",
            accent: "#85A984"
        ),
        r(
            "rum-tequila-whisky-sour",
            "Rum Tequila Whisky Sour",
            "朗姆龙舌兰威士忌酸",
            ["朗姆 20 ml", "龙舌兰 20 ml", "威士忌 20 ml", "柠檬汁 25 ml", "糖浆 15 ml"],
            tags: ["朗姆", "龙舌兰", "威士忌", "酸爽"],
            glass: "酸酒杯",
            method: "加冰摇匀后滤入杯中",
            accent: "#C17C50"
        ),
        r(
            "gin-rum-tequila-cooler",
            "Gin Rum Tequila Cooler",
            "金酒朗姆龙舌兰酷饮",
            ["金酒 20 ml", "朗姆 20 ml", "龙舌兰 20 ml", "青柠汁 15 ml", "雪碧补满"],
            tags: ["金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，最后补雪碧",
            accent: "#6CA98C"
        ),
        r(
            "vodka-rum-whisky-cola",
            "Vodka Rum Whisky Cola",
            "伏特加朗姆威士忌可乐",
            ["伏特加 20 ml", "朗姆 20 ml", "威士忌 20 ml", "可乐补满"],
            tags: ["伏特加", "朗姆", "威士忌", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#8F5B48"
        ),
        r(
            "vodka-gin-whisky-tea",
            "Vodka Gin Whisky Tea",
            "伏特加金酒威士忌冰茶",
            ["伏特加 20 ml", "金酒 20 ml", "威士忌 20 ml", "冰红茶补满", "柠檬汁 5 ml"],
            tags: ["伏特加", "金酒", "威士忌", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#A56B48"
        ),
        r(
            "vodka-rum-tequila-pineapple",
            "Vodka Rum Tequila Pineapple",
            "伏特加朗姆龙舌兰菠萝",
            ["伏特加 20 ml", "朗姆 20 ml", "龙舌兰 20 ml", "菠萝汁 120 ml", "青柠汁 10 ml"],
            tags: ["伏特加", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#D3A148"
        ),
        r(
            "gin-rum-whisky-ginger",
            "Gin Rum Whisky Ginger",
            "金酒朗姆威士忌姜汁",
            ["金酒 20 ml", "朗姆 20 ml", "威士忌 20 ml", "姜汁汽水补满", "青柠汁 10 ml"],
            tags: ["金酒", "朗姆", "威士忌", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，最后补姜汁汽水",
            accent: "#A97D50"
        ),
        r(
            "baileys-vodka-whisky-coffee",
            "Baileys Vodka Whisky Coffee",
            "百利甜伏特加威士忌咖啡",
            ["百利甜 35 ml", "伏特加 15 ml", "威士忌 15 ml", "咖啡 100 ml"],
            tags: ["百利甜", "伏特加", "威士忌", "咖啡", "奶油"],
            glass: "热饮杯",
            method: "热饮搅匀，冷饮可加冰摇匀",
            accent: "#806154"
        ),
        r(
            "baileys-vodka-rum-cream",
            "Baileys Vodka Rum Cream",
            "百利甜伏特加朗姆奶油",
            ["百利甜 35 ml", "伏特加 15 ml", "朗姆 15 ml", "牛奶 80 ml"],
            tags: ["百利甜", "伏特加", "朗姆", "奶油"],
            glass: "岩石杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#9A695C"
        ),
        r(
            "baileys-rum-whisky-coffee",
            "Baileys Rum Whisky Coffee",
            "百利甜朗姆威士忌咖啡",
            ["百利甜 35 ml", "朗姆 15 ml", "威士忌 15 ml", "咖啡 100 ml"],
            tags: ["百利甜", "朗姆", "威士忌", "咖啡", "奶油"],
            glass: "热饮杯",
            method: "热饮搅匀，冷饮可加冰摇匀",
            accent: "#86614F"
        ),
        r(
            "tequila-gin-whisky-ginger",
            "Tequila Gin Whisky Ginger",
            "龙舌兰金酒威士忌姜汁",
            ["龙舌兰 20 ml", "金酒 20 ml", "威士忌 20 ml", "姜汁汽水补满", "青柠汁 10 ml"],
            tags: ["龙舌兰", "金酒", "威士忌", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，最后补姜汁汽水",
            accent: "#A78A50"
        ),
        r(
            "vodka-tequila-whisky-apple",
            "Vodka Tequila Whisky Apple",
            "伏特加龙舌兰威士忌苹果",
            ["伏特加 20 ml", "龙舌兰 20 ml", "威士忌 20 ml", "苹果汁 120 ml"],
            tags: ["伏特加", "龙舌兰", "威士忌", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#A7A552"
        ),
        r(
            "long-island-iced-tea-style",
            "Long Island Iced Tea Style",
            "长岛冰茶风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "柠檬汁 25 ml", "糖浆 20 ml", "可乐补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "柯林斯杯",
            method: "前六项加冰摇匀，倒入杯中后补可乐",
            accent: "#8B6F4D"
        ),
        r(
            "texas-tea-style",
            "Texas Tea Style",
            "德州冰茶风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "威士忌 15 ml", "柠檬汁 25 ml", "糖浆 20 ml", "可乐补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "威士忌", "酸爽", "长饮"],
            glass: "柯林斯杯",
            method: "前七项加冰摇匀，倒入杯中后补可乐",
            note: "酒款较多，建议按高球杯容量控制补满量。",
            accent: "#8D604A"
        ),
        r(
            "long-beach-iced-tea-style",
            "Long Beach Iced Tea Style",
            "长滩冰茶风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "柠檬汁 25 ml", "糖浆 20 ml", "蔓越莓汁补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "柯林斯杯",
            method: "前六项加冰摇匀，倒入杯中后补蔓越莓汁",
            accent: "#B55D7A"
        ),
        r(
            "amf-style",
            "AMF Style",
            "再见混蛋风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "柠檬汁 20 ml", "糖浆 15 ml", "雪碧补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前六项加冰摇匀，倒入杯中后补雪碧",
            accent: "#5798C8"
        ),
        r(
            "blue-motorcycle-style",
            "Blue Motorcycle Style",
            "蓝色摩托车风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "柠檬汁 20 ml", "糖浆 15 ml", "雪碧补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前六项加冰摇匀，倒入杯中后补雪碧",
            accent: "#4F8FC7"
        ),
        r(
            "tokyo-tea-style",
            "Tokyo Tea Style",
            "东京冰茶风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "柠檬汁 20 ml", "糖浆 10 ml", "雪碧补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前六项加冰摇匀，倒入杯中后补雪碧",
            accent: "#6AAE75"
        ),
        r(
            "grateful-dead-style",
            "Grateful Dead Style",
            "感恩而死风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "柠檬汁 20 ml", "糖浆 15 ml", "蔓越莓汁补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前六项加冰摇匀，倒入杯中后补蔓越莓汁",
            accent: "#A7557C"
        ),
        r(
            "electric-iced-tea-style",
            "Electric Iced Tea Style",
            "电光冰茶风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "柠檬汁 20 ml", "糖浆 15 ml", "雪碧补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前六项加冰摇匀，倒入杯中后补雪碧",
            accent: "#4A9FC4"
        ),
        r(
            "bullfrog-style",
            "Bullfrog Style",
            "牛蛙风格版",
            ["伏特加 15 ml", "金酒 15 ml", "朗姆 15 ml", "龙舌兰 15 ml", "青柠汁 10 ml", "能量饮料补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，最后补能量饮料",
            accent: "#75A653"
        ),
        r(
            "baltimore-zoo-style",
            "Baltimore Zoo Style",
            "巴尔的摩动物园风格版",
            ["伏特加 10 ml", "金酒 10 ml", "朗姆 10 ml", "龙舌兰 10 ml", "威士忌 10 ml", "柠檬汁 20 ml", "糖浆 15 ml", "啤酒或雪碧补满"],
            tags: ["伏特加", "金酒", "朗姆", "龙舌兰", "威士忌", "酸爽", "长饮"],
            glass: "高球杯",
            method: "前七项加冰摇匀，倒入杯中后补啤酒或雪碧",
            accent: "#B6814C"
        ),
        r(
            "fog-cutter-style",
            "Fog Cutter Style",
            "破雾者风格版",
            ["金酒 20 ml", "朗姆 20 ml", "威士忌 20 ml", "橙汁 50 ml", "柠檬汁 20 ml", "糖浆 15 ml"],
            tags: ["金酒", "朗姆", "威士忌", "酸爽"],
            glass: "飓风杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#D18E56"
        ),
        r(
            "scorpion-bowl-style",
            "Scorpion Bowl Style",
            "蝎子碗风格版",
            ["朗姆 30 ml", "金酒 15 ml", "龙舌兰 15 ml", "橙汁 60 ml", "菠萝汁 60 ml", "柠檬汁 15 ml", "糖浆 10 ml"],
            tags: ["朗姆", "金酒", "龙舌兰", "酸爽"],
            glass: "大杯或碗",
            method: "加冰摇匀后倒入大杯",
            accent: "#D19A4E"
        ),
        r(
            "zombie-style",
            "Zombie Style",
            "僵尸风格版",
            ["朗姆 45 ml", "龙舌兰 15 ml", "威士忌 15 ml", "菠萝汁 60 ml", "橙汁 40 ml", "青柠汁 15 ml", "糖浆 10 ml"],
            tags: ["朗姆", "龙舌兰", "威士忌", "酸爽"],
            glass: "飓风杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#C77A4D"
        ),
        r(
            "hurricane-style",
            "Hurricane Style",
            "飓风风格版",
            ["朗姆 45 ml", "龙舌兰 15 ml", "柠檬汁 20 ml", "橙汁 60 ml", "菠萝汁 60 ml", "糖浆 15 ml"],
            tags: ["朗姆", "龙舌兰", "酸爽"],
            glass: "飓风杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#D38352"
        ),
        r(
            "mai-tai-style",
            "Mai Tai Style",
            "迈泰风格版",
            ["朗姆 45 ml", "龙舌兰 15 ml", "青柠汁 25 ml", "糖浆 15 ml", "菠萝汁 60 ml 可选"],
            tags: ["朗姆", "龙舌兰", "酸爽"],
            glass: "岩石杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#D0A052"
        ),
        r(
            "gin-and-tonic",
            "Gin and Tonic",
            "金汤力",
            ["金酒 45 ml", "汤力水 150 ml", "柠檬片或青柠片"],
            tags: ["金酒", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，柠檬或青柠装饰",
            accent: "#79A883"
        ),
        r(
            "mojito",
            "Mojito",
            "莫吉托",
            ["朗姆 45 ml", "青柠汁 20 ml", "糖浆 15 ml", "薄荷 6 到 8 片", "苏打水补满"],
            tags: ["朗姆", "酸爽", "长饮"],
            glass: "高球杯",
            method: "薄荷与酸甜料轻压，加冰后入朗姆并补苏打水",
            accent: "#67A979"
        ),
        r(
            "cuba-libre",
            "Cuba Libre",
            "自由古巴",
            ["朗姆 50 ml", "青柠汁 10 ml", "可乐补满"],
            tags: ["朗姆", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调",
            accent: "#9B6048"
        ),
        r(
            "daiquiri",
            "Daiquiri",
            "代基里",
            ["朗姆 60 ml", "青柠汁 20 ml", "糖浆 15 ml"],
            tags: ["朗姆", "酸爽"],
            glass: "鸡尾酒杯",
            method: "加冰摇匀后滤入冰镇杯",
            accent: "#B9A057"
        ),
        r(
            "tommys-margarita",
            "Tommy’s Margarita",
            "汤米玛格丽特",
            ["龙舌兰 60 ml", "青柠汁 30 ml", "龙舌兰糖浆 30 ml", "没有龙舌兰糖浆可用普通糖浆 20 ml"],
            tags: ["龙舌兰", "酸爽"],
            glass: "岩石杯",
            method: "加冰摇匀后倒入杯中",
            accent: "#D0B05D"
        ),
        r(
            "margarita-style",
            "Margarita Style",
            "玛格丽特风格版",
            ["龙舌兰 60 ml", "青柠汁 25 ml", "糖浆 15 ml", "盐边杯可选"],
            tags: ["龙舌兰", "酸爽"],
            glass: "玛格丽特杯",
            method: "加冰摇匀后滤入杯中",
            accent: "#C6A15B"
        ),
        r(
            "paloma",
            "Paloma",
            "帕洛玛",
            ["龙舌兰 50 ml", "青柠汁 10 ml", "西柚汽水补满"],
            tags: ["龙舌兰", "酸爽", "长饮"],
            glass: "高球杯",
            method: "杯中加冰直调，最后补西柚汽水",
            accent: "#D78B79"
        ),
        r(
            "moscow-mule",
            "Moscow Mule",
            "莫斯科骡子",
            ["伏特加 45 ml", "青柠汁 10 ml", "姜汁啤酒或姜汁汽水 120 ml"],
            tags: ["伏特加", "酸爽", "长饮"],
            glass: "铜杯或高球杯",
            method: "杯中加冰直调",
            accent: "#B8744F"
        ),
        r(
            "whiskey-sour",
            "Whiskey Sour",
            "威士忌酸",
            ["威士忌 45 ml", "柠檬汁 25 ml", "糖浆 20 ml", "蛋白可选"],
            tags: ["威士忌", "酸爽"],
            glass: "酸酒杯",
            method: "加冰摇匀后滤入杯中",
            note: "加入蛋白时可先干摇，再加冰摇。",
            accent: "#C47A48"
        ),
        r(
            "old-fashioned",
            "Old Fashioned",
            "古典鸡尾酒",
            ["威士忌 45 ml", "糖浆 5 ml", "苦精 2 到 3 滴", "水少量"],
            tags: ["威士忌"],
            glass: "古典杯",
            method: "杯中搅拌，加入大冰块",
            accent: "#9A5C3E"
        )
    ]

    private static func r(
        _ id: String,
        _ englishName: String,
        _ chineseName: String,
        _ ingredients: [String],
        tags: [String],
        glass: String,
        method: String,
        note: String? = nil,
        accent: String
    ) -> CocktailRecipe {
        CocktailRecipe(
            id: id,
            englishName: englishName,
            chineseName: chineseName,
            ingredients: ingredients,
            tags: tags,
            glass: glass,
            method: method,
            note: note,
            accentHex: accent,
            isUserCreated: false
        )
    }
}
