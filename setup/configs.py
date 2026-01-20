SHADE_SAIL_AUTODRAW_CONFIG = {
    "stepCount": 11,
    "steps": [
        {
            "key": "structure",
            "label": "Structure",
            "show": [
                {"query": "ad_layer", "value": "STRUCTURE"},
                {"query": "ad_layer", "value": "WORKMODEL"}
            ],
            "substeps": [
                {
                    "key": "gen_structure",
                    "label": "Generate structure",
                    "method": "Generate the external frame/posts",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_workmodel",
                    "label": "Generate work model",
                    "method": "Generate and connect workpoints",
                    "options": {
                        {"key": "gen_wm_bisect_method", "software": "direct", "automated": True},
                        {"key": "gen_wm_centroid_method", "software": "direct", "automated": True},
                    },
                }
            ]
        },
        {
            "key": "membrane",
            "label": "Membrane",
            "show": [
                {"query": "ad_layer", "value": "WORKMODEL"},
                {"query": "ad_layer", "value": "PANELMESH"}
            ],
            "substeps": [
                {
                    "key": "gen_panelmesh",
                    "label": "Generate PANELMESH",
                    "method": "Generate mesh from work model",
                    "software": "direct",
                    "automated": False
                }
            ]
        },
        {
            "key": "pattern",
            "label": "Pattern",
            "show": [
                {"query": "ad_layer", "value": "PANELMESH"},
                {"query": "ad_layer", "value": "PANELMEMBRANE"}
            ],
            "substeps": [
                {
                    "key": "gen_panelmembrane",
                    "label": "Generate PANELMEMBRANE",
                    "method": "Generate 2d membrane from mesh",
                    "software": "direct",
                    "automated": False
                }
            ]
        },
        {
            "key": "cable",
            "label": "Cable",
            "show": [
                {"query": "ad_layer", "value": "PANELMEMBRANE"},
                {"query": "ad_layer", "value": "CABLE"},
                {"query": "ad_layer", "value": "HARDWARE"}
            ],
            "substeps": [
                {
                    "key": "bisect_hardware",
                    "label": "Bisect with Hardware",
                    "method": "Bisect corner with HARDWARE",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "draw_cable",
                    "label": "Draw CABLE",
                    "method": "Draw appropriate shapes between edges of hardware",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_cablesection",
                    "label": "Generate cableSection",
                    "method": "Generate cableSection attribute",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "calc_ufc_dist",
                    "label": "Calculate UFC distance",
                    "method": "Calculate distance on UFC diagonals",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "compensation",
            "label": "Compensation",
            "show": [
                {"query": "ad_layer", "value": "HARDWARE"},
                {"query": "ad_layer", "value": "CABLE"},
                {"query": "ad_layer", "value": "COMPENSATEDMODEL"}
            ],
            "substeps": [
                {
                    "key": "gen_comp_model",
                    "label": "Generate COMPENSATEDMODEL",
                    "method": "Generate model scaling appropriately",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "pockets",
            "label": "Pockets",
            "show": [
                {"query": "ad_layer", "value": "COMPENSATEDMODEL"},
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "WHEEL"},
                {"query": "ad_layer", "value": "PERIMITER"}
            ],
            "substeps": [
                {
                    "key": "offset_cable",
                    "label": "Offset cable edges",
                    "method": "Offset cable edges by pocket size on PERIMITER (Layer: WHEEL)",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "offset_track",
                    "label": "Offset track edges",
                    "method": "Offset track edges appropriately, space matchmarks according to scale",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "draw_pocket_corners",
                    "label": "Draw POCKET corners",
                    "method": "Draw appropriate corners on POCKET",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "draw_pocket_labels",
                    "label": "Draw POCKET labels",
                    "method": "Draw corner and exit labels on POCKET (Layer: PEN)",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "seams",
            "label": "Seams",
            "show": [
                 {"query": "ad_layer", "value": "PERIMITER"},
                 {"query": "ad_layer", "value": "SEAM"}
            ],
            "substeps": [
                {
                    "key": "draw_seams",
                    "label": "Draw seams",
                    "method": "Draw appropriate seams on SEAM",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "panels",
            "label": "Panels",
            "show": [
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "SEAM"},
                {"query": "ad_layer", "value": "CUTPANELS"}
            ],
            "substeps": [
                {
                    "key": "gen_cutpanels",
                    "label": "Generate CUTPANELS",
                    "method": "Generate CUTPANELS with POCKET and SEAM",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_cutting_panels",
                    "label": "Generate cutting panels",
                    "method": "Generate panels for cutting on CUTPANELS considering seam allowance",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "add_matchmarks",
                    "label": "Add match marks",
                    "method": "Add match marks on seams on CUTPANELS (Layer: PEN)",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "add_seam_labels",
                    "label": "Add seam labels",
                    "method": "Add seam labels on CUTPANELS (Layer: PEN)",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_doublers",
                    "label": "Generate doublers",
                    "method": "Generate doublers on CUTPANELS",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "calc_ufc_len",
                    "label": "Calculate UFC length",
                    "method": "Calculate total UFC length required on CUTPANELS",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "mark_ufc",
                    "label": "Mark UFC lines",
                    "method": "Mark lines for UFC",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "nest",
            "label": "Nest",
            "show": [
                 {"query": "ad_layer", "value": "CUTPANELS"},
                 {"query": "ad_layer", "value": "PLOT"},
                 {"query": "ad_layer", "value": "PLOTLABELS"}
            ],
            "substeps": [
                {
                    "key": "nest_panels",
                    "label": "Nest panels",
                    "method": "Nest panels within fabric dimensions minimising usage on PLOT",
                    "software": "direct",
                    "automated": False
                },
                {
                    "key": "mirror_plot",
                    "label": "Mirror PLOT",
                    "method": "If pockets are underside, mirror PLOT",
                    "software": "direct",
                    "automated": False
                },
                {
                    "key": "draw_plot_labels",
                    "label": "Draw PLOT labels",
                    "method": "Draw larger labels on PLOTLABELS",
                    "software": "direct",
                    "automated": False
                },
                {
                    "key": "nest_ufc",
                    "label": "Nest UFC",
                    "method": "Determine UFC fit and nest appropriately",
                    "software": "direct",
                    "automated": False
                }
            ]
        },
        {
            "key": "client_drawing",
            "label": "Client Drawing",
            "show": [
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "SEAM"},
                {"query": "ad_layer", "value": "CLIENTDRAWING"}
            ],
            "substeps": [
                {
                    "key": "draw_client_details",
                    "label": "Draw client details",
                    "method": "Draw corner details on CLIENTDRAWING",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "floor_drawing",
            "label": "Floor Drawing",
            "show": [
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "SEAM"},
                {"query": "ad_layer", "value": "FLOORDRAWING"}
            ],
            "substeps": [
                {
                    "key": "draw_floor_details",
                    "label": "Draw floor details",
                    "method": "Draw sail details (corner, dim, exit, logo, keder, tabs, trace, ufc, links) on FLOORDRAWING",
                    "software": "direct",
                    "automated": True
                }
            ]
        }
    ]
}
