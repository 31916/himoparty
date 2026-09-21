// Deterministic boards with replay-verified solution paths.
export const levels = [
  {
    "id": 1,
    "title": "はじめの一歩",
    "group": "はじめて",
    "cols": 3,
    "rows": 3,
    "ropes": [
      [
        0,
        5
      ],
      [
        1,
        8
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 1,
        "to": 4
      }
    ]
  },
  {
    "id": 2,
    "title": "ひとつずつ",
    "group": "はじめて",
    "cols": 3,
    "rows": 3,
    "ropes": [
      [
        0,
        2
      ],
      [
        1,
        7
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 0,
        "to": 4
      }
    ]
  },
  {
    "id": 3,
    "title": "ちょっと寄り道",
    "group": "はじめて",
    "cols": 3,
    "rows": 3,
    "ropes": [
      [
        0,
        5
      ],
      [
        2,
        6
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 1,
        "to": 7
      },
      {
        "rope": 0,
        "end": 1,
        "to": 4
      }
    ]
  },
  {
    "id": 4,
    "title": "くるりと回って",
    "group": "はじめて",
    "cols": 3,
    "rows": 3,
    "ropes": [
      [
        8,
        0
      ],
      [
        2,
        3
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 0,
        "to": 7
      },
      {
        "rope": 1,
        "end": 1,
        "to": 4
      }
    ]
  },
  {
    "id": 5,
    "title": "ひらめきの芽",
    "group": "はじめて",
    "cols": 4,
    "rows": 3,
    "ropes": [
      [
        3,
        8
      ],
      [
        11,
        2
      ],
      [
        0,
        10
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 1,
        "to": 6
      },
      {
        "rope": 0,
        "end": 0,
        "to": 7
      },
      {
        "rope": 2,
        "end": 1,
        "to": 6
      }
    ]
  },
  {
    "id": 6,
    "title": "三色の出会い",
    "group": "なれてきた",
    "cols": 4,
    "rows": 3,
    "ropes": [
      [
        0,
        11
      ],
      [
        3,
        8
      ],
      [
        6,
        10
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 1,
        "to": 7
      },
      {
        "rope": 0,
        "end": 1,
        "to": 6
      },
      {
        "rope": 0,
        "end": 1,
        "to": 2
      }
    ]
  },
  {
    "id": 7,
    "title": "ほどける予感",
    "group": "なれてきた",
    "cols": 4,
    "rows": 3,
    "ropes": [
      [
        7,
        1
      ],
      [
        11,
        0
      ],
      [
        9,
        3
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 0,
        "to": 6
      },
      {
        "rope": 2,
        "end": 0,
        "to": 10
      },
      {
        "rope": 2,
        "end": 0,
        "to": 6
      }
    ]
  },
  {
    "id": 8,
    "title": "向こう側へ",
    "group": "なれてきた",
    "cols": 4,
    "rows": 3,
    "ropes": [
      [
        11,
        1
      ],
      [
        6,
        3
      ],
      [
        2,
        7
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 0,
        "to": 10
      },
      {
        "rope": 1,
        "end": 0,
        "to": 5
      },
      {
        "rope": 2,
        "end": 0,
        "to": 6
      }
    ]
  },
  {
    "id": 9,
    "title": "小さな工夫",
    "group": "なれてきた",
    "cols": 4,
    "rows": 3,
    "ropes": [
      [
        2,
        10
      ],
      [
        5,
        11
      ],
      [
        0,
        8
      ],
      [
        4,
        7
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 1,
        "to": 6
      },
      {
        "rope": 1,
        "end": 0,
        "to": 9
      },
      {
        "rope": 3,
        "end": 0,
        "to": 5
      },
      {
        "rope": 3,
        "end": 0,
        "to": 9
      }
    ]
  },
  {
    "id": 10,
    "title": "ひとやすみの前に",
    "group": "なれてきた",
    "cols": 4,
    "rows": 3,
    "ropes": [
      [
        4,
        9
      ],
      [
        5,
        7
      ],
      [
        6,
        1
      ],
      [
        2,
        8
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 1,
        "to": 11
      },
      {
        "rope": 0,
        "end": 0,
        "to": 0
      },
      {
        "rope": 3,
        "end": 1,
        "to": 4
      },
      {
        "rope": 2,
        "end": 1,
        "to": 5
      },
      {
        "rope": 3,
        "end": 1,
        "to": 5
      }
    ]
  },
  {
    "id": 11,
    "title": "重なる色",
    "group": "ひと工夫",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        12,
        2
      ],
      [
        11,
        4
      ],
      [
        1,
        19
      ],
      [
        14,
        13
      ]
    ],
    "solution": [
      {
        "rope": 2,
        "end": 0,
        "to": 0
      },
      {
        "rope": 0,
        "end": 0,
        "to": 7
      },
      {
        "rope": 1,
        "end": 0,
        "to": 6
      },
      {
        "rope": 1,
        "end": 0,
        "to": 1
      }
    ]
  },
  {
    "id": 12,
    "title": "空きをさがして",
    "group": "ひと工夫",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        0,
        17
      ],
      [
        5,
        19
      ],
      [
        12,
        9
      ],
      [
        4,
        15
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 0,
        "to": 10
      },
      {
        "rope": 0,
        "end": 1,
        "to": 12
      },
      {
        "rope": 0,
        "end": 1,
        "to": 7
      },
      {
        "rope": 1,
        "end": 0,
        "to": 11
      },
      {
        "rope": 1,
        "end": 0,
        "to": 12
      }
    ]
  },
  {
    "id": 13,
    "title": "ゆっくり考えて",
    "group": "ひと工夫",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        6,
        18
      ],
      [
        1,
        16
      ],
      [
        0,
        3
      ],
      [
        8,
        19
      ],
      [
        10,
        14
      ]
    ],
    "solution": [
      {
        "rope": 4,
        "end": 1,
        "to": 13
      },
      {
        "rope": 0,
        "end": 0,
        "to": 7
      },
      {
        "rope": 1,
        "end": 0,
        "to": 6
      },
      {
        "rope": 4,
        "end": 1,
        "to": 12
      },
      {
        "rope": 1,
        "end": 0,
        "to": 5
      },
      {
        "rope": 4,
        "end": 0,
        "to": 11
      }
    ]
  },
  {
    "id": 14,
    "title": "道をゆずって",
    "group": "ひと工夫",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        3,
        17
      ],
      [
        10,
        18
      ],
      [
        1,
        14
      ],
      [
        9,
        5
      ],
      [
        4,
        13
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 1,
        "to": 12
      },
      {
        "rope": 3,
        "end": 0,
        "to": 8
      },
      {
        "rope": 3,
        "end": 0,
        "to": 7
      },
      {
        "rope": 4,
        "end": 1,
        "to": 8
      },
      {
        "rope": 0,
        "end": 0,
        "to": 2
      },
      {
        "rope": 0,
        "end": 0,
        "to": 7
      }
    ]
  },
  {
    "id": 15,
    "title": "ひらける景色",
    "group": "ひと工夫",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        1,
        7
      ],
      [
        18,
        8
      ],
      [
        4,
        11
      ],
      [
        5,
        9
      ],
      [
        14,
        6
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 1,
        "to": 13
      },
      {
        "rope": 0,
        "end": 1,
        "to": 2
      },
      {
        "rope": 3,
        "end": 0,
        "to": 0
      },
      {
        "rope": 2,
        "end": 0,
        "to": 3
      },
      {
        "rope": 2,
        "end": 0,
        "to": 8
      },
      {
        "rope": 2,
        "end": 0,
        "to": 13
      }
    ]
  },
  {
    "id": 16,
    "title": "じっくり挑戦",
    "group": "じっくり",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        9,
        11
      ],
      [
        18,
        0
      ],
      [
        7,
        19
      ],
      [
        14,
        6
      ],
      [
        1,
        16
      ]
    ],
    "solution": [
      {
        "rope": 4,
        "end": 1,
        "to": 15
      },
      {
        "rope": 1,
        "end": 0,
        "to": 17
      },
      {
        "rope": 2,
        "end": 0,
        "to": 12
      },
      {
        "rope": 0,
        "end": 1,
        "to": 12
      },
      {
        "rope": 0,
        "end": 1,
        "to": 7
      },
      {
        "rope": 1,
        "end": 1,
        "to": 5
      },
      {
        "rope": 1,
        "end": 1,
        "to": 6
      }
    ]
  },
  {
    "id": 17,
    "title": "結び目のむこう",
    "group": "じっくり",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        1,
        10
      ],
      [
        0,
        17
      ],
      [
        6,
        13
      ],
      [
        11,
        3
      ],
      [
        12,
        8
      ],
      [
        18,
        7
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 1,
        "to": 16
      },
      {
        "rope": 3,
        "end": 1,
        "to": 2
      },
      {
        "rope": 4,
        "end": 0,
        "to": 17
      },
      {
        "rope": 2,
        "end": 1,
        "to": 12
      },
      {
        "rope": 4,
        "end": 1,
        "to": 3
      },
      {
        "rope": 5,
        "end": 1,
        "to": 8
      },
      {
        "rope": 2,
        "end": 0,
        "to": 7
      },
      {
        "rope": 0,
        "end": 1,
        "to": 11
      }
    ]
  },
  {
    "id": 18,
    "title": "あと一歩ずつ",
    "group": "じっくり",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        13,
        17
      ],
      [
        5,
        19
      ],
      [
        4,
        0
      ],
      [
        2,
        15
      ],
      [
        18,
        3
      ],
      [
        16,
        1
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 0,
        "to": 12
      },
      {
        "rope": 1,
        "end": 0,
        "to": 6
      },
      {
        "rope": 1,
        "end": 0,
        "to": 7
      },
      {
        "rope": 4,
        "end": 1,
        "to": 8
      },
      {
        "rope": 5,
        "end": 1,
        "to": 6
      },
      {
        "rope": 3,
        "end": 0,
        "to": 1
      },
      {
        "rope": 3,
        "end": 0,
        "to": 6
      },
      {
        "rope": 1,
        "end": 0,
        "to": 2
      },
      {
        "rope": 1,
        "end": 0,
        "to": 3
      }
    ]
  },
  {
    "id": 19,
    "title": "ひらめきをつないで",
    "group": "じっくり",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        10,
        3
      ],
      [
        16,
        6
      ],
      [
        1,
        19
      ],
      [
        14,
        17
      ],
      [
        0,
        12
      ],
      [
        15,
        9
      ]
    ],
    "solution": [
      {
        "rope": 1,
        "end": 1,
        "to": 11
      },
      {
        "rope": 0,
        "end": 0,
        "to": 5
      },
      {
        "rope": 5,
        "end": 0,
        "to": 10
      },
      {
        "rope": 0,
        "end": 0,
        "to": 6
      },
      {
        "rope": 0,
        "end": 0,
        "to": 7
      },
      {
        "rope": 2,
        "end": 1,
        "to": 18
      },
      {
        "rope": 2,
        "end": 1,
        "to": 13
      },
      {
        "rope": 2,
        "end": 1,
        "to": 8
      },
      {
        "rope": 4,
        "end": 1,
        "to": 7
      }
    ]
  },
  {
    "id": 20,
    "title": "おおきな達成",
    "group": "じっくり",
    "cols": 5,
    "rows": 4,
    "ropes": [
      [
        17,
        2
      ],
      [
        15,
        8
      ],
      [
        13,
        12
      ],
      [
        16,
        5
      ],
      [
        19,
        7
      ],
      [
        10,
        3
      ]
    ],
    "solution": [
      {
        "rope": 0,
        "end": 1,
        "to": 1
      },
      {
        "rope": 2,
        "end": 0,
        "to": 18
      },
      {
        "rope": 4,
        "end": 1,
        "to": 12
      },
      {
        "rope": 3,
        "end": 0,
        "to": 11
      },
      {
        "rope": 3,
        "end": 0,
        "to": 6
      },
      {
        "rope": 0,
        "end": 0,
        "to": 12
      },
      {
        "rope": 0,
        "end": 0,
        "to": 7
      },
      {
        "rope": 0,
        "end": 0,
        "to": 2
      }
    ]
  }
];
