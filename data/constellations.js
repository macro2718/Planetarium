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
        id: 'cepheus',
        name: 'ケフェウス座',
        description: '北極星付近で家のような五角形を描く王の星座。',
        starIds: ['errai', 'alfirk', 'alderamin', 'zetaCep', 'deltaCep'],
        lines: [
            ['errai', 'alfirk'],        // 王冠から肩
            ['alfirk', 'alderamin'],    // 肩から腰
            ['alderamin', 'zetaCep'],   // 腰回り
            ['zetaCep', 'deltaCep'],    // 裾
            ['deltaCep', 'errai'],      // 王の胸で閉じる
            ['deltaCep', 'alfirk']      // 背中を補強
        ]
    },
    {
        id: 'draco',
        name: 'りゅう座',
        description: '北極星を取り囲む長い竜がとぐろを巻く星座。',
        starIds: ['thuban', 'edasich', 'rastaban', 'kuma', 'eltanin', 'grumium', 'aldhibah'],
        lines: [
            ['thuban', 'edasich'],      // 尾根元
            ['edasich', 'rastaban'],    // 背をたどる
            ['rastaban', 'kuma'],       // 頭部へ
            ['kuma', 'eltanin'],        // 竜の額
            ['eltanin', 'grumium'],     // 顎先
            ['grumium', 'aldhibah'],    // 下顎
            ['aldhibah', 'rastaban'],   // 頭部を閉じる
            ['edasich', 'aldhibah']     // 背から首筋への補強
        ]
    },
    {
        id: 'perseus',
        name: 'ペルセウス座',
        description: 'アンドロメダ姫を救う英雄が剣とメデューサの首を掲げる星座。',
        starIds: ['mirfak', 'algol', 'miram', 'atik', 'menkib'],
        lines: [
            ['algol', 'mirfak'],        // 首を掲げる腕
            ['mirfak', 'miram'],        // 胸から肩
            ['miram', 'atik'],          // 腕から剣
            ['atik', 'menkib'],         // 剣先
            ['menkib', 'algol'],        // 剣から首へ戻る
            ['mirfak', 'atik']          // 脚線美を補う
        ]
    },
    {
        id: 'cetus',
        name: 'くじら座',
        description: 'アンドロメダをのみ込もうとした海の怪物が描かれる大きな星座。',
        starIds: ['menkar', 'kaffaljidhma', 'mira', 'batenKaitos', 'denebKaitos'],
        lines: [
            ['menkar', 'kaffaljidhma'], // 頭部
            ['kaffaljidhma', 'mira'],   // 胴体前半
            ['mira', 'batenKaitos'],    // 腹部
            ['batenKaitos', 'denebKaitos'], // 尾びれ
            ['denebKaitos', 'menkar'],  // 背中を閉じる
            ['menkar', 'mira']          // 胴内を補強
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
        id: 'hydra',
        name: 'うみへび座',
        description: '全天で最も長い星座。孤独なアルファルドを中心に蛇の胴体が春の空を横切る。',
        starIds: ['ashlesha', 'minchir', 'minkar', 'alphard', 'ukdah', 'muHydrae'],
        lines: [
            ['ashlesha', 'minchir'],        // 頭部の弧
            ['minchir', 'minkar'],          // 頭から首へ
            ['minkar', 'alphard'],          // 胸元から心臓
            ['alphard', 'ukdah'],           // 胴体を南へ伸ばす
            ['ukdah', 'muHydrae'],          // しっぽへ
            ['minchir', 'alphard']          // 頭と心臓を結ぶ
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
    },
    {
        id: 'centaurus',
        name: 'ケンタウルス座',
        description: '南天で最も目立つケンタウロスの星座。アルファ・ケンタウリとハダルが南十字を導く。',
        starIds: ['muhlifain', 'hadar', 'rigilKentaurus', 'menkent', 'epsilonCen', 'deltaCen'],
        lines: [
            ['muhlifain', 'hadar'],           // 胴体から肩
            ['hadar', 'rigilKentaurus'],      // 肩から前脚
            ['rigilKentaurus', 'menkent'],    // 前脚から頭部
            ['menkent', 'muhlifain'],         // 頭から背へ戻る
            ['hadar', 'epsilonCen'],          // 胴の南縁
            ['epsilonCen', 'deltaCen'],       // 後脚上部
            ['deltaCen', 'muhlifain'],        // 胴体を閉じる
            ['epsilonCen', 'rigilKentaurus']  // 胴中央の補強
        ]
    },
    {
        id: 'carina',
        name: 'りゅうこつ座',
        description: 'アルゴ船の船底から帆へ伸びる南天の象徴的な星座。カノープスが甲板を照らす。',
        starIds: ['canopus', 'miaplacidus', 'thetaCar', 'aspidiske', 'avior'],
        lines: [
            ['canopus', 'miaplacidus'],   // 船底を描く
            ['miaplacidus', 'thetaCar'],  // 帆柱へ
            ['thetaCar', 'aspidiske'],    // 帆の上縁
            ['aspidiske', 'avior'],       // 船尾へ滑る
            ['avior', 'canopus'],         // 船体を閉じる
            ['thetaCar', 'canopus']       // 帆柱を支える補強
        ]
    },
    {
        id: 'crux',
        name: 'みなみじゅうじ座',
        description: '十字架のシルエットで南天の方位を示す小さくも目立つ星座。',
        starIds: ['gacrux', 'acrux', 'mimosa', 'ginan', 'imai'],
        lines: [
            ['gacrux', 'acrux'],      // 十字の縦軸
            ['mimosa', 'ginan'],      // 十字の横軸
            ['gacrux', 'mimosa'],     // 頭から右腕
            ['gacrux', 'ginan'],      // 頭から左腕
            ['acrux', 'imai'],        // 足元の延長
            ['imai', 'mimosa'],       // 右下を補強
            ['imai', 'ginan']         // 左下を補強
        ]
    },
    {
        id: 'coronaBorealis',
        name: 'かんむり座',
        description: 'アリアドネの冠が夜空に置かれたような繊細な弧を描く小星座。',
        starIds: ['nusakan', 'gammaCrB', 'epsilonCrB', 'alphecca', 'thetaCrB'],
        lines: [
            ['nusakan', 'gammaCrB'],      // 冠の左側
            ['gammaCrB', 'epsilonCrB'],   // 弧の下部
            ['epsilonCrB', 'alphecca'],   // 宝石へ連なる
            ['alphecca', 'thetaCrB'],     // 冠の右側
            ['thetaCrB', 'nusakan'],      // 上部で閉じる
            ['epsilonCrB', 'thetaCrB']    // 弧を補強
        ]
    },
    {
        id: 'hercules',
        name: 'ヘラクレス座',
        description: '夏の大三角の北側でうずくまる英雄の星座。赤く脈打つラス・アルゲティが頭部の目印。',
        starIds: ['rasalgethi', 'kornephoros', 'sarin', 'rutilicus', 'etaHer'],
        lines: [
            ['rasalgethi', 'kornephoros'],   // 頭から肩
            ['kornephoros', 'sarin'],        // 肩から胸
            ['sarin', 'rutilicus'],          // 胸から膝
            ['rutilicus', 'etaHer'],         // 膝から腕先
            ['etaHer', 'rasalgethi'],        // 腕から頭へ戻る
            ['sarin', 'etaHer']              // 胸と腕を補強
        ]
    },
    {
        id: 'ophiuchus',
        name: 'へびつかい座',
        description: 'へびを押さえ込む巨人が黄道上に立つ。頭のラス・アルハゲと手元のイェッドが特徴的。',
        starIds: ['rasalhague', 'cebalrai', 'yedPrior', 'yedPosterior', 'sabik', 'zetaOph'],
        lines: [
            ['rasalhague', 'cebalrai'],   // 頭から肩
            ['cebalrai', 'yedPrior'],     // 右腕の上部
            ['yedPrior', 'yedPosterior'], // 手の甲
            ['yedPosterior', 'zetaOph'],  // 蛇を押さえる腕
            ['zetaOph', 'sabik'],         // 蛇と脚部
            ['sabik', 'cebalrai'],        // 腰へ戻る
            ['rasalhague', 'yedPrior']    // 頭から手への補強
        ]
    },
    {
        id: 'delphinus',
        name: 'いるか座',
        description: '夏の宵空に小さなひし形で跳ね上がり、七夕の天の川に寄り添う可憐な星座。',
        starIds: ['sualocin', 'rotanev', 'gammaDel', 'deltaDel', 'aldulfin'],
        lines: [
            ['sualocin', 'rotanev'],
            ['rotanev', 'gammaDel'],
            ['gammaDel', 'aldulfin'],
            ['aldulfin', 'deltaDel'],
            ['deltaDel', 'sualocin'],
            ['gammaDel', 'deltaDel']
        ]
    },
    {
        id: 'corvus',
        name: 'からす座',
        description: '春の南空で台形に並ぶ四つの星が翼を広げるカラスの姿を描く。',
        starIds: ['gienah', 'kraz', 'algorab', 'minkar', 'alchiba'],
        lines: [
            ['gienah', 'kraz'],
            ['kraz', 'algorab'],
            ['algorab', 'minkar'],
            ['minkar', 'gienah'],
            ['minkar', 'alchiba'],
            ['alchiba', 'gienah']
        ]
    },
    {
        id: 'eridanus',
        name: 'エリダヌス座',
        description: 'オリオンの足元から南天へと流れ下る長い河の星座。アケルナルが河口を照らす。',
        starIds: ['cursa', 'rana', 'zaurak', 'acamar', 'achernar'],
        lines: [
            ['cursa', 'rana'],
            ['rana', 'zaurak'],
            ['zaurak', 'acamar'],
            ['acamar', 'achernar'],
            ['rana', 'acamar']
        ]
    },
    {
        id: 'serpens',
        name: 'へび座',
        description: 'へびつかい座に両断される珍しい星座。頭部と尾部が黄道沿いにゆるやかにうねる。',
        starIds: ['unukalhai', 'chow', 'gammaSer', 'epsilonSer', 'etaSer', 'alya'],
        lines: [
            ['unukalhai', 'chow'],
            ['chow', 'gammaSer'],
            ['gammaSer', 'epsilonSer'],
            ['epsilonSer', 'etaSer'],
            ['etaSer', 'alya'],
            ['gammaSer', 'unukalhai']
        ]
    },
    {
        id: 'lepus',
        name: 'うさぎ座',
        description: 'オリオンの足元で跳ね回る野うさぎ。冬の低空に並ぶ黄白色の星列が愛らしい。',
        starIds: ['arneb', 'nihal', 'epsilonLep', 'muLep', 'kappaLep'],
        lines: [
            ['arneb', 'nihal'],
            ['nihal', 'epsilonLep'],
            ['epsilonLep', 'muLep'],
            ['muLep', 'arneb'],
            ['muLep', 'kappaLep'],
            ['kappaLep', 'arneb']
        ]
    }
];
