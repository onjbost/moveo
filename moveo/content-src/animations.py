"""Keyframes of the stick-figure animations (side view, facing right, y up, ground at y = 0).

Each frame stores absolute segment angles in degrees (0 = right, 90 = up) plus the hip position:
the web player only does forward kinematics and interpolation. Hands and feet that must stay
planted are placed here with a 2-link inverse kinematics solver, so the figure doesn't slide.
"""
import math

# segment lengths (figure ~180 units tall)
T, U, F, TH, SH, FOOT = 50, 28, 26, 42, 40, 13
ANKLE_H = 4


def ik(root, target, l1, l2, bend):
    """Angles (deg) of a 2-link chain from root to target; bend=+1/-1 picks the elbow/knee side."""
    dx, dy = target[0] - root[0], target[1] - root[1]
    d = min(math.hypot(dx, dy), l1 + l2 - 0.01)
    base = math.atan2(dy, dx)
    a = math.acos(max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
    a1 = base + bend * a
    j = (root[0] + l1 * math.cos(a1), root[1] + l1 * math.sin(a1))
    a2 = math.atan2(target[1] - j[1], target[0] - j[0])
    return [round(math.degrees(a1), 1), round(math.degrees(a2), 1)]


def shoulder(hip, torso):
    r = math.radians(torso)
    return (hip[0] + T * math.cos(r), hip[1] + T * math.sin(r))


def frame(t, hip, torso, head=None, bend=0, armN=None, armF=None, legN=None, legF=None):
    return {
        't': t, 'hip': [round(hip[0], 1), round(hip[1], 1)], 'torso': torso, 'bend': bend,
        'head': torso if head is None else head,
        'armN': armN, 'armF': armF or armN, 'legN': legN, 'legF': legF or legN,
    }


def leg_to(hip, ankle, knee_forward=True, foot=0):
    th, sh = ik(hip, ankle, TH, SH, 1 if knee_forward else -1)
    return [th, sh, foot]


def arm_to(sh_pos, hand, elbow_back=True):
    return ik(sh_pos, hand, U, F, 1 if elbow_back else -1)


ANIMS = {}

# ------------------------------------------------------------------ squat
stand_hip = (0, ANKLE_H + TH + SH - 0.5)
low_hip = (-32, 50)
ANKLE = (0, ANKLE_H)
ANIMS['squat'] = {
    'duration': 3200,
    'frames': [
        frame(0, stand_hip, 90, legN=leg_to(stand_hip, ANKLE), armN=[268, 272]),
        frame(0.45, low_hip, 52, head=70, legN=leg_to(low_hip, ANKLE), armN=[8, 2]),
        frame(0.6, low_hip, 52, head=70, legN=leg_to(low_hip, ANKLE), armN=[8, 2]),
        frame(1, stand_hip, 90, legN=leg_to(stand_hip, ANKLE), armN=[268, 272]),
    ],
}

# ------------------------------------------------------------------ push-up (toes pinned, hands planted)
def plank(sh_height, hands_x):
    a = math.degrees(math.asin((sh_height - ANKLE_H) / (TH + SH + T)))
    r = math.radians(a)
    ankle = (0, ANKLE_H)
    hip = (ankle[0] + (TH + SH) * math.cos(r), ankle[1] + (TH + SH) * math.sin(r))
    sp = shoulder(hip, a)
    leg = [round(a + 180, 1), round(a + 180, 1), 300]
    return hip, round(a, 1), leg, arm_to(sp, (hands_x, 0), elbow_back=True)

hands_x = 128
up = plank(53, hands_x)
down = plank(20, hands_x)
ANIMS['push-up'] = {
    'duration': 2600,
    'frames': [
        frame(0, up[0], up[1], legN=up[2], armN=up[3]),
        frame(0.45, down[0], down[1], legN=down[2], armN=down[3]),
        frame(0.55, down[0], down[1], legN=down[2], armN=down[3]),
        frame(1, up[0], up[1], legN=up[2], armN=up[3]),
    ],
}



# ------------------------------------------------------------------ cat-cow (quadruped, spine bends)
q_hip = (0, 46)
q_knee = (0, 3)
q_leg = [270, 180, 180]  # thigh down to the knee, shin along the floor
q_sh = shoulder(q_hip, 0)
q_arm = arm_to(q_sh, (q_sh[0], 0))
ANIMS['cat-cow'] = {
    'duration': 5000,
    'frames': [
        frame(0, q_hip, 0, head=-10, bend=0, legN=q_leg, armN=q_arm),
        frame(0.25, q_hip, 0, head=35, bend=-7, legN=q_leg, armN=q_arm),   # mucca: schiena giù, sguardo su
        frame(0.45, q_hip, 0, head=35, bend=-7, legN=q_leg, armN=q_arm),
        frame(0.75, q_hip, 0, head=-45, bend=9, legN=q_leg, armN=q_arm),  # gatto: schiena tonda, mento giù
        frame(0.95, q_hip, 0, head=-45, bend=9, legN=q_leg, armN=q_arm),
        frame(1, q_hip, 0, head=-10, bend=0, legN=q_leg, armN=q_arm),
    ],
}

# ------------------------------------------------------------------ prone paddle (arms alternate)
p_hip = (0, 7)
p_leg = [180, 180, 200]
p_torso = 14
ANIMS['prone-paddle'] = {
    'duration': 1800,
    'alternate': True,  # the far arm runs half a cycle later
    'surface': 'water',  # lying on a board: the arms dip below the waterline
    'frames': [
        frame(0, p_hip, p_torso, head=25, legN=p_leg, armN=[12, 6]),        # entra lungo davanti
        frame(0.3, p_hip, p_torso, head=25, legN=p_leg, armN=[300, 270]),   # spinge sotto il petto
        frame(0.55, p_hip, p_torso, head=25, legN=p_leg, armN=[205, 195]),  # fino al fianco
        frame(0.8, p_hip, p_torso, head=25, legN=p_leg, armN=[120, 60]),    # recupero fuori dall'acqua
        frame(1, p_hip, p_torso, head=25, legN=p_leg, armN=[12, 6]),
    ],
}

# ------------------------------------------------------------------ pop-up (regular stance: front foot right)
pr_hip = (0, 8)
pr_leg = [180, 180, 200]
pr_sh = shoulder(pr_hip, 2)
cb_sh = shoulder(pr_hip, 34)
front_ankle, back_ankle = (44, ANKLE_H), (-22, ANKLE_H)
cr_hip = (8, 44)
tk_hip = (4, 30)
st_hip = (10, 66)
ANIMS['pop-up'] = {
    'duration': 4200,
    'frames': [
        frame(0, pr_hip, 2, head=15, legN=pr_leg, armN=arm_to(pr_sh, (pr_sh[0] - 4, 0))),
        frame(0.15, pr_hip, 2, head=15, legN=pr_leg, armN=arm_to(pr_sh, (pr_sh[0] - 4, 0))),
        frame(0.32, pr_hip, 34, head=45, legN=pr_leg, armN=arm_to(cb_sh, (pr_sh[0] - 4, 0))),        # spinta
        frame(0.42, tk_hip, 30, head=35, legN=leg_to(tk_hip, (22, 16)), legF=leg_to(tk_hip, (-30, 10)),
              armN=arm_to(shoulder(tk_hip, 30), (pr_sh[0] - 4, 0))),                                 # ginocchia sotto
        frame(0.5, cr_hip, 38, head=20, legN=leg_to(cr_hip, front_ankle), legF=leg_to(cr_hip, back_ankle),
              armN=[300, 330], armF=[290, 320]),                                                    # piedi sotto
        frame(0.68, st_hip, 78, head=5, legN=leg_to(st_hip, front_ankle), legF=leg_to(st_hip, back_ankle),
              armN=[5, 0], armF=[172, 180]),                                                        # in piedi
        frame(0.92, st_hip, 78, head=5, legN=leg_to(st_hip, front_ankle), legF=leg_to(st_hip, back_ankle),
              armN=[5, 0], armF=[172, 180]),
        frame(1, pr_hip, 2, head=15, legN=pr_leg, armN=arm_to(pr_sh, (pr_sh[0] - 4, 0))),
    ],
}
ANIMS['pop-up'] = {**ANIMS['pop-up'], 'surface': 'board'}
ANIMS['pop-up-slow'] = {**ANIMS['pop-up'], 'duration': 6500}
