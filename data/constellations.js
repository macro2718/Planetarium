export const BASE_CONSTELLATION_DATA = [
    {
        id: 'orion',
        name: 'オリオン座',
        description: '冬の代表星座。三ツ星と赤いベテルギウスが目印。',
        starIds: ['betelgeuse', 'bellatrix', 'mintaka', 'alnilam', 'alnitak', 'saiph', 'rigel'],
        lines: [
            ['betelgeuse', 'bellatrix'],
            ['betelgeuse', 'saiph'],
            ['bellatrix', 'rigel'],
            ['mintaka', 'alnilam'],
            ['alnilam', 'alnitak'],
            ['alnitak', 'saiph'],
            ['mintaka', 'rigel'],
            ['saiph', 'rigel']
        ]
    },
    {
        id: 'ursaMajor',
        name: '北斗七星',
        description: 'おおぐま座のひしゃく型の星並び。',
        starIds: ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid'],
        lines: [
            ['dubhe', 'merak'],
            ['merak', 'phecda'],
            ['phecda', 'megrez'],
            ['megrez', 'alioth'],
            ['alioth', 'mizar'],
            ['mizar', 'alkaid']
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
        name: '白鳥座',
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
        id: 'leo',
        name: '獅子座',
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
        starIds: ['elnath', 'ain', 'aldebaran', 'alcyone'],
        lines: [
            ['elnath', 'ain'],
            ['ain', 'aldebaran'],
            ['ain', 'alcyone']
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
    }
];
