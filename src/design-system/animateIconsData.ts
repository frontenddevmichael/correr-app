/* eslint-disable */
// GENERATED FILE — do not edit by hand.
// Produced by scripts/gen-animate-icons.mjs from the Animate UI registry cache
// (https://animate-ui.com/docs/icons). Rerun that script to refresh.

export type AnimScalar = number | string;
/** A single value, or a keyframe sequence (Framer Motion style). */
export type AnimValue = AnimScalar | AnimScalar[];

export interface AnimTransition {
  duration: number;
  delay: number;
  ease: string | number[];
  times?: number[];
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  repeatDelay?: number;
}

export interface AnimTransitionSet {
  transition?: AnimTransition;
  propTransitions?: Record<string, AnimTransition>;
}

export interface AnimElementDef {
  /** Variant key (`variants.x`); null for static children. */
  key: string | null;
  tag: string;
  props: Record<string, AnimScalar>;
  children: AnimElementDef[];
  /** [x, y, w, h] in viewBox units — resolves transformOrigin. */
  bbox: [number, number, number, number] | null;
  /** Measured path/line length (only when pathLength is animated). */
  length?: number;
  pathLength?: boolean;
}

export interface AnimStateElement extends AnimTransitionSet {
  initial?: Record<string, AnimValue>;
  animate?: Record<string, AnimValue>;
  /** Transition used when animating back to the initial pose. */
  initialTransition?: AnimTransition;
  initialPropTransitions?: Record<string, AnimTransition>;
  /** transformOrigin string, e.g. "0% 50%". */
  origin?: string;
}

export interface AnimIconDef {
  viewBox: string;
  root: Record<string, AnimScalar>;
  elements: AnimElementDef[];
  states: Record<string, Record<string, AnimStateElement>>;
}

export type AnimateIconName = "home" | "compass" | "sparkles" | "chart" | "plus";

export const ANIMATE_ICONS: Record<AnimateIconName, AnimIconDef> = {
  "home": {
    "viewBox": "0 0 24 24",
    "root": {
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "strokeWidth": 2,
      "strokeLinecap": "round",
      "strokeLinejoin": "round"
    },
    "elements": [
      {
        "key": "group",
        "tag": "g",
        "props": {},
        "children": [
          {
            "key": null,
            "tag": "path",
            "props": {
              "d": "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            },
            "children": [],
            "bbox": [
              3,
              1.9995,
              18,
              19.0005
            ],
            "length": 63.0026
          },
          {
            "key": "door",
            "tag": "path",
            "props": {
              "d": "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
            },
            "children": [],
            "bbox": [
              9,
              12,
              6,
              9
            ],
            "length": 23.1403
          }
        ],
        "bbox": [
          3,
          1.9995,
          18,
          19.0005
        ]
      }
    ],
    "states": {
      "default": {
        "group": {
          "initial": {
            "y": 0
          },
          "animate": {
            "y": [
              0,
              -1,
              0
            ]
          },
          "transition": {
            "duration": 0.6,
            "delay": 0,
            "ease": "easeInOut"
          }
        },
        "door": {
          "initial": {
            "scaleX": 1
          },
          "animate": {
            "scaleX": [
              1,
              0.25,
              1
            ]
          },
          "transition": {
            "duration": 0.6,
            "delay": 0,
            "ease": "easeInOut"
          },
          "origin": "0% 50%"
        }
      }
    }
  },
  "compass": {
    "viewBox": "0 0 24 24",
    "root": {
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "strokeWidth": 2,
      "strokeLinecap": "round",
      "strokeLinejoin": "round"
    },
    "elements": [
      {
        "key": "path",
        "tag": "path",
        "props": {
          "d": "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"
        },
        "children": [],
        "bbox": [
          7.76,
          7.76,
          8.48,
          8.48
        ],
        "length": 26.5241
      },
      {
        "key": "circle",
        "tag": "circle",
        "props": {
          "cx": 12,
          "cy": 12,
          "r": 10
        },
        "children": [],
        "bbox": [
          2,
          2,
          20,
          20
        ]
      }
    ],
    "states": {
      "default": {
        "path": {
          "initial": {
            "rotate": 0
          },
          "animate": {
            "rotate": [
              0,
              95,
              75
            ]
          },
          "transition": {
            "duration": 0.7,
            "delay": 0,
            "ease": "easeInOut"
          }
        }
      },
      "default-loop": {
        "path": {
          "initial": {
            "rotate": 0
          },
          "animate": {
            "rotate": [
              0,
              95,
              75,
              -20,
              0
            ]
          },
          "transition": {
            "duration": 1.4,
            "delay": 0,
            "ease": "easeInOut"
          }
        }
      }
    }
  },
  "sparkles": {
    "viewBox": "0 0 24 24",
    "root": {
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "strokeWidth": 2,
      "strokeLinecap": "round",
      "strokeLinejoin": "round"
    },
    "elements": [
      {
        "key": "group",
        "tag": "g",
        "props": {},
        "children": [
          {
            "key": "path",
            "tag": "path",
            "props": {
              "d": "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
            },
            "children": [],
            "bbox": [
              1.9976,
              1.9976,
              20.0048,
              20.0048
            ],
            "length": 65.9041
          }
        ],
        "bbox": [
          1.9976,
          1.9976,
          20.0048,
          20.0048
        ]
      },
      {
        "key": "plus",
        "tag": "path",
        "props": {
          "d": "M20 2v4 M22 4h-4"
        },
        "children": [],
        "bbox": [
          18,
          2,
          4,
          4
        ],
        "length": 8
      },
      {
        "key": "circle",
        "tag": "circle",
        "props": {
          "cx": "4",
          "cy": "20",
          "r": "2"
        },
        "children": [],
        "bbox": [
          2,
          18,
          4,
          4
        ]
      }
    ],
    "states": {
      "default": {
        "group": {
          "initial": {
            "scale": 1
          },
          "animate": {
            "scale": [
              1,
              0.9,
              1.1,
              1
            ]
          },
          "transition": {
            "duration": 0.6,
            "delay": 0,
            "ease": "easeInOut"
          }
        },
        "plus": {
          "initial": {
            "scale": 1,
            "rotate": 0
          },
          "animate": {
            "scale": [
              1,
              0.7,
              1.2,
              1
            ],
            "rotate": [
              0,
              90
            ]
          },
          "transition": {
            "duration": 0.6,
            "delay": 0.15,
            "ease": "easeInOut"
          }
        },
        "circle": {
          "initial": {
            "scale": 1
          },
          "animate": {
            "scale": [
              1,
              0.7,
              1.2,
              1
            ]
          },
          "transition": {
            "duration": 0.6,
            "delay": 0.15,
            "ease": "easeInOut"
          }
        }
      }
    }
  },
  "chart": {
    "viewBox": "0 0 24 24",
    "root": {
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "strokeWidth": 2,
      "strokeLinecap": "round",
      "strokeLinejoin": "round"
    },
    "elements": [
      {
        "key": "path1",
        "tag": "path",
        "props": {
          "d": "M8 17V13"
        },
        "children": [],
        "bbox": [
          8,
          13,
          0,
          4
        ],
        "length": 4,
        "pathLength": true
      },
      {
        "key": "path2",
        "tag": "path",
        "props": {
          "d": "M13 17V5"
        },
        "children": [],
        "bbox": [
          13,
          5,
          0,
          12
        ],
        "length": 12,
        "pathLength": true
      },
      {
        "key": "path3",
        "tag": "path",
        "props": {
          "d": "M18 17V9"
        },
        "children": [],
        "bbox": [
          18,
          9,
          0,
          8
        ],
        "length": 8,
        "pathLength": true
      },
      {
        "key": "path4",
        "tag": "path",
        "props": {
          "d": "M3 3v16a2 2 0 0 0 2 2h16"
        },
        "children": [],
        "bbox": [
          3,
          3,
          18,
          18
        ],
        "length": 35.1403
      }
    ],
    "states": {
      "default": {
        "path1": {
          "initial": {
            "opacity": 1,
            "pathLength": 1
          },
          "animate": {
            "opacity": [
              0,
              1
            ],
            "pathLength": [
              0,
              1
            ]
          },
          "transition": {
            "duration": 0.4,
            "delay": 0,
            "ease": "easeInOut"
          }
        },
        "path2": {
          "initial": {
            "opacity": 1,
            "pathLength": 1
          },
          "animate": {
            "opacity": [
              0,
              1
            ],
            "pathLength": [
              0,
              1
            ]
          },
          "transition": {
            "duration": 0.4,
            "delay": 0.3,
            "ease": "easeInOut"
          }
        },
        "path3": {
          "initial": {
            "opacity": 1,
            "pathLength": 1
          },
          "animate": {
            "opacity": [
              0,
              1
            ],
            "pathLength": [
              0,
              1
            ]
          },
          "transition": {
            "duration": 0.4,
            "delay": 0.6,
            "ease": "easeInOut"
          }
        }
      },
      "default-loop": {
        "path1": {
          "initial": {
            "opacity": 1,
            "pathLength": 1
          },
          "animate": {
            "pathLength": [
              1,
              1,
              0,
              0,
              1
            ],
            "opacity": [
              1,
              1,
              0,
              0,
              1
            ]
          },
          "transition": {
            "duration": 2,
            "delay": 0,
            "ease": "easeInOut",
            "times": [
              0,
              0.3,
              0.5,
              0.5,
              0.7
            ]
          }
        },
        "path2": {
          "initial": {
            "opacity": 1,
            "pathLength": 1
          },
          "animate": {
            "pathLength": [
              1,
              1,
              0,
              0,
              1
            ],
            "opacity": [
              1,
              1,
              0,
              0,
              1
            ]
          },
          "transition": {
            "duration": 2,
            "delay": 0,
            "ease": "easeInOut",
            "times": [
              0,
              0.15,
              0.35,
              0.65,
              0.85
            ]
          }
        },
        "path3": {
          "initial": {
            "opacity": 1,
            "pathLength": 1
          },
          "animate": {
            "pathLength": [
              1,
              1,
              0,
              0,
              1
            ],
            "opacity": [
              1,
              1,
              0,
              0,
              1
            ]
          },
          "transition": {
            "duration": 2,
            "delay": 0,
            "ease": "easeInOut",
            "times": [
              0,
              0,
              0.2,
              0.8,
              1
            ]
          }
        }
      }
    }
  },
  "plus": {
    "viewBox": "0 0 24 24",
    "root": {
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "strokeWidth": 2,
      "strokeLinecap": "round",
      "strokeLinejoin": "round"
    },
    "elements": [
      {
        "key": "line1",
        "tag": "line",
        "props": {
          "x1": 12,
          "y1": 19,
          "x2": 12,
          "y2": 5
        },
        "children": [],
        "bbox": [
          12,
          5,
          0,
          14
        ],
        "length": 14
      },
      {
        "key": "line2",
        "tag": "line",
        "props": {
          "x1": 5,
          "y1": 12,
          "x2": 19,
          "y2": 12
        },
        "children": [],
        "bbox": [
          5,
          12,
          14,
          0
        ],
        "length": 14
      }
    ],
    "states": {
      "default": {
        "line1": {
          "initial": {
            "rotate": 0
          },
          "animate": {
            "rotate": 90
          },
          "transition": {
            "duration": 0.4,
            "delay": 0.1,
            "ease": "easeInOut"
          },
          "initialTransition": {
            "duration": 0.4,
            "delay": 0.1,
            "ease": "easeInOut"
          }
        },
        "line2": {
          "initial": {
            "rotate": 0
          },
          "animate": {
            "rotate": 90
          },
          "transition": {
            "duration": 0.4,
            "delay": 0,
            "ease": "easeInOut"
          },
          "initialTransition": {
            "duration": 0.4,
            "delay": 0,
            "ease": "easeInOut"
          }
        }
      },
      "x": {
        "line1": {
          "initial": {
            "rotate": 0,
            "x1": 12,
            "y1": 19,
            "x2": 12,
            "y2": 5
          },
          "animate": {
            "rotate": 45,
            "x1": 12,
            "y1": 20.5,
            "x2": 12,
            "y2": 3.5
          },
          "transition": {
            "duration": 0.3,
            "delay": 0.1,
            "ease": "easeInOut"
          },
          "initialTransition": {
            "duration": 0.3,
            "delay": 0.1,
            "ease": "easeInOut"
          }
        },
        "line2": {
          "initial": {
            "rotate": 0,
            "x1": 5,
            "y1": 12,
            "x2": 19,
            "y2": 12
          },
          "animate": {
            "rotate": 45,
            "x1": 3.5,
            "y1": 12,
            "x2": 20.5,
            "y2": 12
          },
          "transition": {
            "duration": 0.3,
            "delay": 0,
            "ease": "easeInOut"
          },
          "initialTransition": {
            "duration": 0.3,
            "delay": 0,
            "ease": "easeInOut"
          }
        }
      }
    }
  }
};
