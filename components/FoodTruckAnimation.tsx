"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function FoodTruckAnimation() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <div
                className="h-full w-full"
                style={{
                    WebkitMaskImage:
                        "linear-gradient(to right, transparent 0%, black 10%, black 95%, transparent 100%)",
                    maskImage:
                        "linear-gradient(to right, transparent 0%, black 10%, black 95%, transparent 100%)",
                }}
            >
                <DotLottieReact
                    src="/lottie/foodtruck-animation.json"
                    loop
                    autoplay
                    className="h-full w-full"
                />
            </div>
        </div>
    );
}