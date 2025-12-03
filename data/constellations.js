export const BASE_CONSTELLATION_DATA = [
    {
        id: 'orion',
        name: 'オリオン座',
        description: '冬の代表星座。三ツ星と赤いベテルギウスが目印。',
        starIds: ['betelgeuse', 'bellatrix', 'mintaka', 'alnilam', 'alnitak', 'saiph', 'rigel'],
        lines: [
            ['betelgeuse', 'bellatrix'],
            ['bellatrix', 'mintaka'],
            ['mintaka', 'alnilam'],
            ['alnilam', 'alnitak'],
            ['alnitak', 'saiph'],
            ['alnilam', 'rigel'],
            ['mintaka', 'rigel'],
            ['betelgeuse', 'saiph']
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
            ['deneb', 'sadr'],
            ['sadr', 'gienah'],
            ['sadr', 'deltaCyg'],
            ['deltaCyg', 'albireo'],
            ['sadr', 'albireo']
        ]
    },
    {
        id: 'ursaMinor',
        name: 'こぐま座',
        description: '北極星を含む小さなひしゃく。',
        starIds: ['polaris', 'yildun', 'epsilonUMi', 'zetaUMi', 'pherkad', 'kochab'],
        lines: [
            ['polaris', 'yildun'],
            ['yildun', 'epsilonUMi'],
            ['epsilonUMi', 'zetaUMi'],
            ['zetaUMi', 'pherkad'],
            ['pherkad', 'kochab'],
            ['kochab', 'polaris']
        ]
    },
    {
        id: 'leo',
        name: '獅子座',
        description: '春の夜空に輝くライオンのシルエット。',
        starIds: ['regulus', 'adhafera', 'algeiba', 'zosma', 'chertan', 'denebola'],
        lines: [
            ['regulus', 'adhafera'],
            ['adhafera', 'algeiba'],
            ['algeiba', 'zosma'],
            ['zosma', 'chertan'],
            ['chertan', 'denebola'],
            ['regulus', 'denebola']
        ]
    }
];
