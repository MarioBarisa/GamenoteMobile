type Swipe = {
    dx: number;
    dy: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    index: number;
    count: number;
};

export function gallerySwipe({dx, dy, vx, vy, width, height, index, count}: Swipe) {
    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) < width * 0.2 && !(Math.abs(dx) > 20 && Math.abs(vx) > 0.5)) return "reset";
        if (dx < 0 && index < count - 1) return "next";
        if (dx > 0 && index > 0) return "previous";
    } else if (Math.abs(dy) > height * 0.18 || (Math.abs(dy) > 20 && Math.abs(vy) > 1)) {
        return "close";
    }
    return "reset";
}
