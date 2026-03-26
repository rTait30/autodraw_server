# ---------- DATA --------------

LEAD_TENANT_CONFIG = {
    "CP": {
        "tenant_id": "825",
        "owner_id": "14366",
        "category_id": "1735",
        "stage_id": "2123",
        "default_client_wg_id": "194156",
        "category_custom_field_id": "3553",
        "get_percent_custom_field_id": "5289",
        "go_percent_custom_field_id": "5290",
        "default_category_display": "1a. Shade (Shade Cloth)",
    },
    "DR": {
        "tenant_id": "826",
        "owner_id": "14364",
        "category_id": "2140",
        "stage_id": "2607",
        "default_client_wg_id": "178827",
        "category_custom_field_id": "3686",
        "get_percent_custom_field_id": "5385",
        "go_percent_custom_field_id": "5386",
        "default_category_display": "",
    },
}


DR_CATEGORIES = {
    "1a": {"id": 1,  "name": "Dam & Pond Liners",             "group": "Environmental"},
    "1b": {"id": 2,  "name": "Tank Liners",                   "group": "Environmental"},
    "1c": {"id": 3,  "name": "Spill Control and Containment", "group": "Environmental"},
    "1d": {"id": 4,  "name": "Waste Management",              "group": "Environmental"},

    "2a": {"id": 5,  "name": "Tarpaulins",                    "group": "Tarps and Covers"},
    "2b": {"id": 6,  "name": "Grain and Stockpile Covers",    "group": "Tarps and Covers"},
    "2c": {"id": 7,  "name": "Truck & Transport",             "group": "Tarps and Covers"},

    "3a": {"id": 8,  "name": "Marine Curtains",               "group": "Industrial Curtains"},
    "3b": {"id": 9,  "name": "Industrial Curtains",           "group": "Industrial Curtains"},
    "3c": {"id": 10, "name": "Cold Store Curtains",           "group": "Industrial Curtains"},

    "4a": {"id": 11, "name": "Fumigation Tarps",              "group": "Fumigation"},
    "4b": {"id": 12, "name": "Fumigation Chamber Covers",     "group": "Fumigation"},

    "5":  {"id": 13, "name": "Poultry",                       "group": "Poultry"},
    "6":  {"id": 14, "name": "Miscellaneous",                 "group": "Miscellaneous"},
}

CP_CATEGORIES = {

    "1a": {"id": 1,  "name": "Shade",             "group": "Shade Cloth"},
    "1b": {"id": 2,  "name": "Shade",              "group": "PVC Membranes"},

}
