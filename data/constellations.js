export const BASE_CONSTELLATION_DATA = [
    {
        id: 'orion',
        name: 'オリオン座',
        description: '冬の代表星座。三ツ星と赤いベテルギウスが目印。',
        starIds: ['betelgeuse', 'bellatrix', 'mintaka', 'alnilam', 'alnitak', 'saiph', 'rigel', 'meissa'],
        lines: [
            ['betelgeuse', 'bellatrix'],
            ['betelgeuse', 'alnitak'],
            ['bellatrix', 'mintaka'],
            ['mintaka', 'alnilam'],
            ['alnilam', 'alnitak'],
            ['alnitak', 'saiph'],
            ['mintaka', 'rigel'],
            ['saiph', 'rigel'],
            ['meissa', 'betelgeuse'],
            ['meissa', 'bellatrix']
        ]
    },
    {
        id: 'cassiopeia',
        name: 'カシオペア座',
        description: 'W字が特徴の北天星座。',
        starIds: ['caph', 'shedar', 'gammaCas', 'ruchbah', 'segin'],
        lines: [
            ['caph', 'shedar'],
            ['shedar', 'gammaCas'],
            ['gammaCas', 'ruchbah'],
            ['ruchbah', 'segin']
        ]
    },
    {
        id: 'cygnus',
        name: 'はくちょう座',
        description: '夏の天頂を横切る十字型の星並び。',
        starIds: ['deneb', 'sadr', 'gienah', 'deltaCyg', 'albireo'],
        lines: [
            ['deneb', 'sadr'],       // 尾から胸へ（縦線上部）
            ['sadr', 'albireo'],     // 胸から頭へ（縦線下部）
            ['gienah', 'sadr'],      // 翼から胸へ（横線左）
            ['sadr', 'deltaCyg']     // 胸から翼へ（横線右）
        ]
    },
    {
        id: 'ursaMinor',
        name: 'こぐま座',
        description: '北極星を含む小さなひしゃく。',
        starIds: ['polaris', 'yildun', 'epsilonUMi', 'zetaUMi', 'pherkad', 'kochab'],
        lines: [
            ['polaris', 'yildun'],      // 柄の先端（北極星）から
            ['yildun', 'epsilonUMi'],   // 柄の中間
            ['epsilonUMi', 'zetaUMi'],  // 柄の根元へ
            ['zetaUMi', 'pherkad'],     // ひしゃくの底へ
            ['zetaUMi', 'kochab'],      // ひしゃくの底へ（分岐）
            ['pherkad', 'kochab']       // ひしゃくの底を閉じる
        ]
    },
    {
        id: 'ursaMajor',
        name: 'おおぐま座',
        description: '北天に大きな熊の姿を描く星座で、北斗七星はその背から尻尾を成す部分。',
        starIds: ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid'],
        lines: [
            ['dubhe', 'merak'],         // 背中から腰
            ['merak', 'phecda'],        // 胴体の底
            ['phecda', 'megrez'],       // 背中を上る
            ['megrez', 'alioth'],       // 背から尾へ
            ['alioth', 'mizar'],        // 尾を延ばす
            ['mizar', 'alkaid'],        // 尾の先端
            ['phecda', 'alioth'],       // 胴体を斜めに結ぶ
            ['dubhe', 'megrez']         // 肩から背を補強
        ]
    },
    {
        id: 'leo',
        name: 'しし座',
        description: '春の夜空に輝くライオンのシルエット。',
        starIds: ['regulus', 'adhafera', 'algeiba', 'zosma', 'chertan', 'denebola'],
        lines: [
            ['regulus', 'algeiba'],     // 心臓からたてがみへ
            ['algeiba', 'adhafera'],    // たてがみ（鎌の部分）
            ['algeiba', 'zosma'],       // たてがみから背中へ
            ['zosma', 'denebola'],      // 背中からしっぽへ
            ['zosma', 'chertan'],       // 背中から後ろ足へ
            ['chertan', 'denebola']     // 後ろ足からしっぽへ（三角形を閉じる）
        ]
    },
    {
        id: 'scorpius',
        name: 'さそり座',
        description: '夏の南天を弓なりに横切る赤い心臓と長い尾。',
        starIds: ['acrab', 'dschubba', 'antares', 'sargas', 'shaula', 'lesath'],
        lines: [
            ['acrab', 'dschubba'],    // 頭部
            ['dschubba', 'antares'],  // 胸
            ['antares', 'sargas'],    // 腹から尾へ
            ['sargas', 'shaula'],     // 尾を伸ばす
            ['shaula', 'lesath']      // 毒針の先端
        ]
    },
    {
        id: 'lyra',
        name: 'こと座',
        description: 'ベガを頂点に小さな平行四辺形を伴う琴の形。',
        starIds: ['vega', 'sheliak', 'sulafat', 'deltalyr', 'zetalyr'],
        lines: [
            ['vega', 'sheliak'],
            ['vega', 'sulafat'],
            ['sheliak', 'deltalyr'],
            ['deltalyr', 'zetalyr'],
            ['zetalyr', 'sulafat'],
            ['sheliak', 'sulafat']
        ]
    },
    {
        id: 'aquila',
        name: 'わし座',
        description: '天の川を横切る翼を広げたわし。',
        starIds: ['tarazed', 'altair', 'alshain', 'denebokab'],
        lines: [
            ['tarazed', 'altair'],
            ['altair', 'alshain'],
            ['tarazed', 'denebokab'],
            ['denebokab', 'altair']
        ]
    },
    {
        id: 'virgo',
        name: 'おとめ座',
        description: '麦の穂スピカを手にした女神の姿。',
        starIds: ['vindemiatrix', 'porrima', 'heze', 'zaniah', 'spica'],
        lines: [
            ['vindemiatrix', 'porrima'],
            ['porrima', 'heze'],
            ['heze', 'spica'],
            ['porrima', 'zaniah'],
            ['zaniah', 'spica']
        ]
    },
    {
        id: 'bootes',
        name: 'うしかい座',
        description: '春の大曲線の先に見える羊飼い。',
        starIds: ['nekkar', 'seginus', 'izar', 'arcturus', 'muphrid'],
        lines: [
            ['nekkar', 'seginus'],
            ['seginus', 'izar'],
            ['izar', 'arcturus'],
            ['arcturus', 'muphrid'],
            ['seginus', 'arcturus']
        ]
    },
    {
        id: 'taurus',
        name: 'おうし座',
        description: 'ヒヤデスとプレアデスが形作る雄牛の顔。',
        starIds: ['elnath', 'ain', 'aldebaran', 'alcyone', 'tianguan'],
        lines: [
            ['elnath', 'ain'],
            ['ain', 'aldebaran'],
            ['ain', 'alcyone'],
            ['elnath', 'tianguan'],
            ['tianguan', 'ain']
        ]
    },
    {
        id: 'auriga',
        name: 'ぎょしゃ座',
        description: 'カペラを頂点とした五角形が特徴。',
        starIds: ['capella', 'menkalinan', 'elnath', 'mahasim', 'kabdhilinan'],
        lines: [
            ['capella', 'menkalinan'],
            ['menkalinan', 'elnath'],
            ['capella', 'mahasim'],
            ['mahasim', 'kabdhilinan'],
            ['mahasim', 'elnath']
        ]
    },
    {
        id: 'canisMinor',
        name: 'こいぬ座',
        description: 'プロキオンとゴメイサが描く小さな犬。',
        starIds: ['procyon', 'gomeisa'],
        lines: [
            ['procyon', 'gomeisa']
        ]
    },
    {
        id: 'canisMajor',
        name: 'おおいぬ座',
        description: '冬の大三角の一角シリウスを中心に、大犬が南天を駆ける姿。',
        starIds: ['sirius', 'mirzam', 'muliphein', 'wezen', 'adhara', 'furud', 'aludra'],
        lines: [
            ['mirzam', 'sirius'],
            ['sirius', 'muliphein'],
            ['sirius', 'wezen'],
            ['wezen', 'adhara'],
            ['adhara', 'furud'],
            ['furud', 'aludra']
        ]
    },
    {
        id: 'pegasus',
        name: 'ペガスス座',
        description: '秋の夜空に大きな四角形「ペガススの大四辺形」を形作る天馬の星座。',
        starIds: ['markab', 'scheat', 'algenib', 'alpheratz', 'enif', 'biham', 'homam'],
        lines: [
            ['markab', 'scheat'],
            ['scheat', 'alpheratz'],
            ['alpheratz', 'algenib'],
            ['algenib', 'markab'],
            ['scheat', 'enif'],     // 首から鼻先へ
            ['enif', 'biham'],      // 鼻先から胴体へ
            ['biham', 'homam'],     // 胴体をたどる
            ['homam', 'markab']     // 背中側で大四辺形に接続
        ]
    },
    {
        id: 'andromeda',
        name: 'アンドロメダ座',
        description: 'ペガススの大四辺形から鎖のように星が連なる星座。アンドロメダ銀河の位置の目印にもなる。',
        starIds: ['alpheratz', 'deltaAnd', 'mirach', 'almach'],
        lines: [
            ['alpheratz', 'deltaAnd'],
            ['deltaAnd', 'mirach'],
            ['mirach', 'almach']
        ]
    },
    {
        id: 'sagittarius',
        name: 'いて座',
        description: '夏の南の空に「ティーポット」の姿で現れ、天の川の中心方向を示す黄道星座。',
        starIds: ['kausBorealis', 'kausMedia', 'kausAustralis', 'nunki', 'ascella', 'alnasl', 'tauSgr', 'albaldah'],
        lines: [
            ['kausBorealis', 'kausMedia'],       // ティーポット上部（左）
            ['kausMedia', 'kausAustralis'],       // 左側の縁
            ['kausAustralis', 'ascella'],         // 底面左〜右
            ['ascella', 'nunki'],                 // 取っ手下部
            ['nunki', 'kausBorealis'],            // 取っ手上部
            ['kausMedia', 'alnasl'],              // 注ぎ口の付け根
            ['alnasl', 'tauSgr'],                 // 注ぎ口の先端へ
            ['tauSgr', 'kausAustralis'],          // 注ぎ口から底面へ戻る
            ['kausMedia', 'albaldah'],            // ふたの中心
            ['albaldah', 'nunki']                 // ふたから取っ手上部へ
        ]
    },
    {
        id: 'piscisAustrinus',
        name: 'みなみのうお座',
        description: '秋の南の空で孤独に輝く一等星フォーマルハウトを擁する星座。',
        starIds: ['fomalhaut', 'dalim', 'epsilonPsa', 'deltaPsa', 'thetaPsa'],
        lines: [
            ['fomalhaut', 'dalim'],
            ['dalim', 'deltaPsa'],
            ['deltaPsa', 'epsilonPsa'],
            ['epsilonPsa', 'fomalhaut'],
            ['fomalhaut', 'thetaPsa']
        ]
    },
    {
        id: 'aries',
        name: 'おひつじ座',
        description: '春の星座。2つの明るい星が羊の頭を形づくる。',
        starIds: ['hamal', 'sheratan', 'mesarthim', 'botein'],
        lines: [
            ['mesarthim', 'hamal'],      // 角の付け根から頭へ
            ['hamal', 'sheratan'],       // ハマル〜シェラタン（羊の頭）
            ['sheratan', 'botein']       // 体へ続く星並び
        ]
    },
    {
        id: 'gemini',
        name: 'ふたご座',
        description: '冬の夜空に並んで輝く双子の星座。',
        starIds: ['castor', 'pollux', 'wasat', 'alhena', 'mebsuta', 'tejat', 'propus'],
        lines: [
            ['castor', 'pollux'],       // 双子の頭
            ['castor', 'wasat'],        // 胸元の結び
            ['pollux', 'wasat'],
            ['castor', 'mebsuta'],      // カストル側の胴体
            ['mebsuta', 'tejat'],       // カストル側の脚
            ['wasat', 'mebsuta'],       // 胸から肩へ
            ['pollux', 'alhena'],       // ポルックス側の胴体
            ['wasat', 'alhena'],        // 胸から肩へ
            ['alhena', 'propus'],       // ポルックス側の脚
            ['propus', 'tejat']         // 足元を結ぶ
        ]
    },
    {
        id: 'cancer',
        name: 'かに座',
        description: '暗い星が多いが、かにの爪と甲羅がかすかに描かれる星座。',
        starIds: ['acubens', 'asellusBorealis', 'asellusAustralis', 'altarf'],
        lines: [
            ['acubens', 'asellusBorealis'],   // 右の爪〜甲羅
            ['acubens', 'asellusAustralis'],  // 右の爪〜甲羅
            ['asellusBorealis', 'asellusAustralis'], // 甲羅まわり
            ['asellusAustralis', 'altarf']     // 南の脚先
        ]
    },
    {
        id: 'libra',
        name: 'てんびん座',
        description: 'さそり座の西に位置する、天秤の皿を表す星座。',
        starIds: ['zubenelgenubi', 'zubeneschamali', 'brachium', 'zubenelakrab'],
        lines: [
            ['zubenelgenubi', 'zubeneschamali'],  // 皿と梁
            ['zubenelgenubi', 'brachium'],         // 南の皿
            ['zubeneschamali', 'zubenelakrab'],    // 北の皿
            ['brachium', 'zubenelakrab']           // 天秤を囲む
        ]
    },
    {
        id: 'capricornus',
        name: 'やぎ座',
        description: '細長い三角形で描かれる海山羊の星座。',
        starIds: ['algedi', 'dabih', 'nashira', 'denebAlgedi'],
        lines: [
            ['algedi', 'dabih'],         // 角〜胴体方向
            ['dabih', 'nashira'],
            ['nashira', 'denebAlgedi'],
            ['denebAlgedi', 'algedi'],
            ['nashira', 'algedi']        // 山羊の輪郭を補強
        ]
    },
    {
        id: 'aquarius',
        name: 'みずがめ座',
        description: '水瓶から水が流れ出すような形に星が並ぶ。',
        starIds: ['sadalsuud', 'sadalmelik', 'sadachbia', 'skat', 'situla', 'ancha'],
        lines: [
            ['sadalsuud', 'sadalmelik'], // 水瓶の口
            ['sadalmelik', 'sadachbia'], // 水の流れの方向
            ['sadachbia', 'skat'],       // 流れる水
            ['sadalmelik', 'ancha'],     // 水瓶の胴
            ['ancha', 'situla'],         // 取っ手の付け根
            ['situla', 'sadachbia']      // 水瓶と水流をつなぐ
        ]
    },
    {
        id: 'pisces',
        name: 'うお座',
        description: '二匹の魚を結ぶひもが大きなV字を描く星座。結び目アルレシャを中心に形をたどれる。',
        starIds: ['alrescha', 'torcular', 'fumalsamakah', 'alpherg'],
        lines: [
            ['alrescha', 'torcular'],    // 西の魚へ伸びる紐
            ['alrescha', 'fumalsamakah'],// 東の魚へ伸びる紐
            ['fumalsamakah', 'alpherg'], // 東の魚を形作る
            ['torcular', 'alpherg']      // 西の魚と紐を結ぶ
        ]
    }
];
