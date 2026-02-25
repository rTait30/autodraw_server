# Geometric Algorithm for Shade Sail Layout

This document describes the mathematical algorithm used to reconstruct the 2D planar shape of a shade sail from measured edge lengths and diagonal measurements.

## 1. Problem Definition
Given a set of $N$ points in 3D space representing the corners of a sail, we have:
*   **Edge Lengths**: Measured 3D distances between adjacent points.
*   **Diagonal Lengths**: Measured 3D distances between non-adjacent points (cross-bracing).
*   **Heights ($z$)**: The vertical elevation of each corner.

**Goal**: Determine the $(x, y)$ coordinates for all $N$ points on a 2D plane that best satisfy these measurements.

## 2. Preprocessing: 3D to 2D
First, all measured 3D lengths ($L_{3D}$) are projected onto the horizontal 2D plane ($L_{2D}$) using the known height difference ($\Delta z$) between the two points:

$$ L_{2D} = \sqrt{L_{3D}^2 - \Delta z^2} $$

*Note: If $|\Delta z| > L_{3D}$, the result is clamped to 0.*

## 3. Box Decomposition Strategy
To handle polygons with more than 4 sides, the shape is decomposed into a sequence of Quadrilaterals (Boxes).

For a polygon with vertices $0, 1, \dots, N-1$:
*   **Box 0** (Base): Vertices $[0, 1, N-1, N]$. (Indices modulo $N$, so $N \to 0$, $N-1 \to 5$ for a hexagon).
    *   More precisely: $[0, 1, N-1, N]$ is incorrect for general $N$.
    *   The algorithm defines "Layers" peeling from the outside in.
    *   **Box $k$**: Vertices $[k, k+1, N-1-k-1, N-1-k]$.
        *   Top-Left ($TL$): $k$
        *   Top-Right ($TR$): $k+1$
        *   Bottom-Right ($BR$): $N-k-2$
        *   Bottom-Left ($BL$): $N-k-1$

**Example (Hexagon $N=6$):**
*   **Box 0**: Indices $[0, 1, 4, 5]$.
*   **Box 1**: Indices $[1, 2, 3, 4]$. *(It shares edge $1-4$ with Box 0)*.

## 4. Solving a Single Quadrilateral
Each "Box" consists of 4 known edge lengths ($Top, Right, Bottom, Left$) and 2 known diagonals ($Diag_{Main}, Diag_{Cross}$).
We place it in a local coordinate system with $TL$ at $(0,0)$.

1.  **Triangle 1 ($TL-TR-BL$)**:
    *   We know lengths $Top$ ($TL \to TR$), $Left$ ($TL \to BL$), and $Diag$ ($TR \to BL$).
    *   Calculate angle at $TL$ using Law of Cosines:
        $$ \theta_{TL} = \arccos \left( \frac{Top^2 + Left^2 - Diag^2}{2 \cdot Top \cdot Left} \right) $$
    *   Place $TR$ at $(Top, 0)$.
    *   Place $BL$ at $(Left \cdot \cos \theta_{TL}, -Left \cdot \sin \theta_{TL})$.

2.  **Triangle 2 ($TL-TR-BR$)**:
    *   We find $BR$ by triangulation from $TL$ and $TR$ using lengths $d(TL, BR)$ and $d(TR, BR)$.
    *   This determines the position of all 4 corners relative to $TL$.

## 5. Sequential Global Assembly
We place Box 0 at the global origin. Then we attach Box 1, then Box 2, etc.

**Attachment Logic (The "Hinge"):**
Box $k$ and Box $k+1$ share a common edge:
*   Box $k$'s **Right** edge ($TR_k \to BR_k$).
*   Box $k+1$'s **Left** edge ($TL_{k+1} \to BL_{k+1}$).
*   Note: In the indexing scheme, $TR_k = TL_{k+1}$ and $BR_k = BL_{k+1}$. These are the *same physical points*.

To attach Box $k+1$:
1.  **Calculate Local Shape**: Solve Box $k+1$ in its own local frame.
2.  **Calculate Hinge Angle**:
    *   Let $\theta_{prev}$ be the global angle of the common edge from Box $k$.
    *   In the *local* frame of Box $k+1$, we know the angle of its Left edge is defined by $\alpha_{TL}$ (Angle at Top-Left of Box $k+1$).
    *   The "Hinge Turn" required is:
        $$ \Delta \theta = \theta_{prev} + \alpha_{TL} $$
        *(Previously measuring this turn direction caused errors for complex shapes).*
3.  **Transform**:
    *   Rotate all points in Box $k+1$ by $\Delta \theta$.
    *   Translate so that $TL_{k+1}$ matches the global position of $TR_k$.

## 6. Discrepancy Calculation
Since real-world measurements have errors, the final shape might not close perfectly (e.g., in a quad, the calculated diagonal might not match the measured diagonal).
*   **XY Discrepancy**: The difference between the *calculated* distance and the *measured* distance for verification diagonals.
*   **Blame**: If a discrepancy exceeds a threshold, the error is distributed ("blamed") on the edges involved to indicate potential measurement errors.

