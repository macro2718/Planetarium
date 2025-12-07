export const HISTORICAL_EVENTS = [
    {
        id: 'apollo-11-moonwalk',
        title: 'アポロ11号 月面初踏み',
        description: '人類が初めて月面に立った瞬間。テレビの向こうで世界が固唾を呑んだ時刻へ。',
        dateTime: '1969-07-21T02:56:00Z',
        location: {
            name: 'ヒューストン・ジョンソン宇宙センター',
            lat: 29.5593,
            lon: -95.0892
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
            lon: 170.4830
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
            lon: -118.1165
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
    }
];
