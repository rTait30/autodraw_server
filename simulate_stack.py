
def simulate_layout():
    y_offset = 0
    fabricWidth = 100
    panel_gap = 10
    num_pieces_h = 2
    
    # Current implementation simulation
    print("--- Current Implementation ---")
    for i in range(num_pieces_h):
        strip_y_start = i * fabricWidth
        strip_y_end = strip_y_start + fabricWidth
        
        # Stack Top-to-Bottom
        draw_y_top = y_offset - i * (fabricWidth + panel_gap)
        draw_y_bottom = draw_y_top - fabricWidth
        
        draw_y_start = draw_y_bottom
        
        # Panel 1 (i=0): Tarp Y=0..100. Maps to Draw Y=bottom..top
        # Panel 2 (i=1): Tarp Y=100..200. Maps to Draw Y=bottom..top
        
        print(f"Panel {i+1} (Tarp Y {strip_y_start}-{strip_y_end}):")
        print(f"  Visual Top (Y={draw_y_top}): Tarp Y={strip_y_end}")
        print(f"  Visual Bottom (Y={draw_y_bottom}): Tarp Y={strip_y_start}")
        
    # Option A simulation (P2 Top, P1 Bottom)
    print("\n--- Option A (Reverse Order) ---")
    # We want Panel 2 on Top, Panel 1 Bottom.
    # So i should go 1, 0? Or just change calculation?
    # If we iterate i normally but calculate draw_y differently.
    
    # If we want P2 (i=1) at Top (y_offset), and P1 (i=0) below it.
    # draw_y_top = y_offset - (num_pieces_h - 1 - i) * (fabricWidth + panel_gap)
    # Let's test this formula.
    
    for i in range(num_pieces_h):
        strip_y_start = i * fabricWidth
        strip_y_end = strip_y_start + fabricWidth
        
        draw_y_top = y_offset - (num_pieces_h - 1 - i) * (fabricWidth + panel_gap)
        draw_y_bottom = draw_y_top - fabricWidth
        
        print(f"Panel {i+1} (Tarp Y {strip_y_start}-{strip_y_end}):")
        print(f"  Visual Top (Y={draw_y_top}): Tarp Y={strip_y_end}")
        print(f"  Visual Bottom (Y={draw_y_bottom}): Tarp Y={strip_y_start}")

simulate_layout()
