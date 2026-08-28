//! 黄金示例副本 worlds（批量生成子代理照此复制，替换 <SLUG>/slug/名字/BOSS/文本）
use crate::maps::{PointDef, EnemyDef, NpcDef, ZoneDef, PortalDef, GateDef};

// 3 层地图：每行【必须精确 40 字符】，26 行。用 PowerShell 生成后粘贴：
//   $w=40; $h=26; foreach($y in 0..($h-1)){ if($y -eq 0 -or $y -eq ($h-1)){"#"*$w} else {"#"+"."*($w-2)+"#"} }
// 生成后把第 3 行某格 "." 改成 "P"（出生点），可把若干 "." 改成 "I"（装饰）或 "#"（内部墙体）。
pub static DEMO_F1_MAP: &[&str] = &[
    "########################################",
    "#......................................#",
    "#.............P........................#",
    "#......................................#",
    "########################################",
];
pub static DEMO_F2_MAP: &[&str] = &[
    "########################################",
    "#......................................#",
    "#......................................#",
    "#......................................#",
    "########################################",
];
pub static DEMO_F3_MAP: &[&str] = &[
    "########################################",
    "#......................................#",
    "#......................................#",
    "#......................................#",
    "########################################",
];
pub static DEMO_FLOOR_NAMES: &[&str] = &["一层", "二层", "三层"];

pub static POINTS: &[PointDef] = &[
    PointDef { id: "dm_pt_1", name: "调查点", floor: 0, x: 20, y: 2, route: "dm_00" },
];
pub static ENEMIES: &[EnemyDef] = &[
    EnemyDef { id: "dm_e_1", name: "敌人", floor: 0, x: 30, y: 2, radius: 3, fight: "dm_boss" },
];
pub static NPCS: &[NpcDef] = &[
    NpcDef { id: "dm_n_1", name: "NPC", floor: 0, x: 10, y: 2, talk: "dm_01" },
];
pub static ZONES: &[ZoneDef] = &[
    ZoneDef { id: "dm_z_1", name: "战圈", floor: 0, x: 30, y: 2, kind: "fight", ref_id: "dm_boss" },
];
pub static PORTALS: &[PortalDef] = &[
    PortalDef { id: "dm_p_1", floor: 0, x: 38, y: 2, to_floor: 1, tx: 2, ty: 2 },
];
pub static GATES: &[GateDef] = &[
    GateDef { id: "dm_g_1", name: "门", floor: 0, x: 35, y: 2, need_item: Some("dm_key"), need_flag: None, lock_msg: "锁着", unlock_msg: "开了" },
];