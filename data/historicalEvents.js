export const HISTORICAL_EVENTS = [
    {
        id: 'apollo-11-moonwalk',
        title: 'アポロ11号 月面初踏み',
        description: '人類が初めて月面に立った瞬間。テレビの向こうで世界が固唾を呑んだ時刻へ。',
        dateTime: '1969-07-21T02:56:00Z',
        location: {
            name: 'ヒューストン・ジョンソン宇宙センター',
            lat: 29.5593,
            lon: -95.0892,
            surfaceType: 'grass'
        },
        tags: ['NASA', '月面着陸', 'アームストロング'],
        effects: [
            {
                type: 'info-panel',
                title: '月面に響いた言葉',
                body: '「これは一人の人間にとっては小さな一歩だが、人類にとっては偉大な飛躍である。」着陸船イーグルが静かの海に降り立った瞬間の緊張感を、夜空の静寂とともに振り返ります。'
            },
            {
                type: 'auto-rotate',
                enabled: false
            }
        ]
    },
    {
        id: 'hayleys-comet-1986',
        title: 'ハレー彗星 1986年最接近',
        description: '76年周期の旅人が太陽に最接近した夜。淡い尾が空を横切る。',
        dateTime: '1986-02-09T00:00:00Z',
        location: {
            name: 'ニュージーランド・テカポ湖',
            lat: -44.0033,
            lon: 170.4830,
            surfaceType: 'grass'
        },
        tags: ['彗星', 'テカポ', '観測史'],
        effects: [
            {
                type: 'info-panel',
                title: '76年ぶりの旅人',
                body: '1986年のハレー彗星は淡い尾を引きながら太陽へと接近。南半球では長い尾が夜空を横切り、再会の歓声が上がりました。'
            },
            {
                type: 'comet-tail',
                enabled: true,
                intensity: 1,
                tint: '#87f3ff'
            },
            {
                type: 'meteor-shower',
                enabled: false,
                intensity: 0
            }
        ]
    },
    {
        id: 'leonids-2001',
        title: 'しし座流星群 2001年極大',
        description: '一時間に数千の流星が降り注いだ、記録的な嵐の夜。',
        dateTime: '2001-11-18T10:00:00Z',
        location: {
            name: 'アメリカ・カリフォルニア州パームデール',
            lat: 34.5794,
            lon: -118.1165,
            surfaceType: 'desert'
        },
        tags: ['流星群', '極大', 'しし座'],
        effects: [
            {
                type: 'info-panel',
                title: '流星嵐の記憶',
                body: 'ピーク時には1時間に数千もの流星が流れた2001年のしし座流星群。空全体が光の雨に包まれる様子を強調表示します。'
            },
            {
                type: 'meteor-shower',
                enabled: true,
                intensity: 1
            },
            {
                type: 'comet-tail',
                enabled: false,
                intensity: 0
            }
        ]
    },
    {
        id: 'galileo-jupiter-moons-1610',
        title: 'ガリレオが木星の衛星に気づいた夜',
        description: 'ガリレオが木星の近くに並ぶ「星」を見つけ、やがて衛星と気づく最初の観測夜。',
        dateTime: '1610-01-07T22:00:00Z',
        location: {
            name: 'イタリア・パドヴァ',
            lat: 45.4064,
            lon: 11.8768,
            surfaceType: 'grass'
        },
        tags: ['ガリレオ', '木星', 'ガリレオ衛星'],
        effects: [
            {
                type: 'info-panel',
                title: '望遠鏡が開いた世界',
                body: '1610年1月7日、ガリレオは木星のそばに3つの光点を記録。数日後、それが木星の周りを回る衛星と確信し、地動説を強く後押しする発見となりました。'
            },
            {
                type: 'auto-rotate',
                enabled: false
            }
        ]
    },
    {
        id: 'tycho-supernova-1572',
        title: 'ティコ・ブラーエの「新星（超新星 SN 1572）」',
        description: 'カシオペヤ座に突如現れた明るい新星をティコ・ブラーエが克明に観測した夜。',
        dateTime: '1572-11-11T20:00:00Z',
        location: {
            name: 'フ島（フヴェン島）天文台',
            lat: 55.9021,
            lon: 12.7200,
            surfaceType: 'grass'
        },
        tags: ['ティコ・ブラーエ', '超新星', 'カシオペヤ'],
        effects: [
            {
                type: 'info-panel',
                title: '永遠の天球を揺るがす光',
                body: '1572年11月、肉眼で金星に匹敵する輝きの「新星」が出現。ティコ・ブラーエはその位置変化がないことを示し、天球は不変という当時の常識を覆しました。'
            },
            {
                type: 'auto-rotate',
                enabled: false
            }
        ]
    },
    {
        id: 'meigetsuki-supernova-1054',
        title: '明月記に残る超新星爆発',
        description: '藤原定家の明月記に「客星」と記された超新星（かに星雲の母体）。',
        dateTime: '1054-07-04T12:00:00Z',
        location: {
            name: '日本・京都',
            lat: 35.0116,
            lon: 135.7681,
            surfaceType: 'grass'
        },
        tags: ['明月記', '超新星', 'かに星雲'],
        effects: [
            {
                type: 'info-panel',
                title: '昼間でも見えた客星',
                body: '1054年の超新星爆発は昼間でも観測されたと記録され、後にかに星雲として残された。古記録と現代観測が結びつく瞬間を再現します。'
            },
            {
                type: 'auto-rotate',
                enabled: false
            }
        ]
    },
    {
        id: 'einstein-eclipse-1919',
        title: 'アインシュタイン理論の検証へつながった皆既日食',
        description: '一般相対性理論を支持する観測として名高い、1919年5月29日の皆既日食。',
        dateTime: '1919-05-29T13:08:00Z',
        location: {
            name: 'ポルトガル領プリンシペ島',
            lat: 1.6136,
            lon: 7.4058,
            surfaceType: 'grass'
        },
        tags: ['相対性理論', '日食', 'エディントン'],
        effects: [
            {
                type: 'info-panel',
                title: '曲がる光が示したもの',
                body: 'エディントン隊が皆既中に恒星位置を撮影し、重力による光の曲がりを検証。一般相対性理論の支持を決定づけた歴史的な観測です。'
            },
            {
                type: 'auto-rotate',
                enabled: false
            }
        ]
    },
    {
        id: 'titanic-sinking-1912',
        title: 'タイタニック号沈没の夜',
        description: '波ひとつない鏡のような海に満天の星が映ったと生存者が語る、悲劇の夜。',
        dateTime: '1912-04-15T02:20:00Z',
        location: {
            name: '北大西洋（ニューファンドランド沖）',
            lat: 41.7325,
            lon: -49.9469,
            surfaceType: 'water'
        },
        tags: ['タイタニック', '北大西洋', '航海'],
        effects: [
            {
                type: 'info-panel',
                title: '鏡の海と星の記憶',
                body: '生存者の証言に残る「波がなく鏡のような海面に、信じられないほど満天の星が映っていた」光景を想起する時間。静寂の海原に天の川が映り込む夜空を再現します。'
            },
            {
                type: 'auto-rotate',
                enabled: false
            }
        ]
    }
];
