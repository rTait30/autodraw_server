SHADE_SAIL_AUTODRAW_CONFIG = {
    "stepCount": 5,
    "steps": [
        {
            "key": "structure",
            "label": "Structure",
            "show": [{"query": "ad_layer", "value": "STRUCTURE"}],
            "substeps": [
                {
                    "key": "gen_structure",
                    "label": "Generate external structure",
                    "method": "Generate the external frame/posts",
                    "options": [
                        {"key": "gen_structure", "label": "Standard Frame", "software": "direct", "automated": True, "is_default": True}
                    ]
                },
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
                    "key": "gen_wm",
                    "label": "Generate workmodel",
                    "method": "Generate work points based on hardware distance and pull of membrane",
                    "options": [
                        {"key": "gen_wm_centroid_method", "label": "Centroid Method", "software": "direct", "automated": True, "is_default": False},
                        {"key": "gen_wm_bisect_method", "label": "Bisect Method", "software": "direct", "automated": True, "is_default": True}
                    ]
                },
                {
                    "key": "gen_panelmesh",
                    "label": "Generate PANELMESH",
                    "method": "Generate mesh from work model",
                    "options": [
                        {"key": "std_mesh_gen", "label": "Standard Mesh Gen", "software": "direct", "automated": False, "is_default": True}
                    ]
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
                    "options": [
                        {"key": "std_flatten", "label": "Standard Flatten", "software": "direct", "automated": False, "is_default": True}
                    ]
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
                    "options": [{"key": "std_bisect_hw", "label": "Standard Bisect", "software": "direct", "automated": True, "is_default": True}]
                },
                {
                    "key": "draw_cable",
                    "label": "Draw CABLE",
                    "method": "Draw appropriate shapes between edges of hardware",
                    "options": [{"key": "std_draw_cable", "label": "Standard Cable", "software": "direct", "automated": True, "is_default": True}]
                },
                {
                    "key": "gen_cablesection",
                    "label": "Generate cableSection",
                    "method": "Generate cableSection attribute",
                    "options": [{"key": "std_cable_sect", "label": "Standard Section", "software": "direct", "automated": True, "is_default": True}]
                },
                {
                    "key": "calc_ufc_dist",
                    "label": "Calculate UFC distance",
                    "method": "Calculate distance on UFC diagonals",
                    "options": [{"key": "std_ufc_calc", "label": "Standard Calculation", "software": "direct", "automated": True, "is_default": True}]
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
                    "options": [{"key": "std_compensation", "label": "Standard Compensation", "software": "direct", "automated": True, "is_default": True}]
                }
            ]
        }
    ]
}
