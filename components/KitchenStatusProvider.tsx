"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { KitchenClosedModal } from "@/components/KitchenClosedModal";

type KitchenStatusContextValue = {
    isShiftOpen: boolean;
    /**
     * Returns true when the shift is open. When closed, it opens the
     * "kitchen closed" modal and returns false so callers can abort.
     */
    requireShiftOpen: () => boolean;
};

const KitchenStatusContext = createContext<KitchenStatusContextValue>({
    isShiftOpen: true,
    requireShiftOpen: () => true,
});

export function useKitchenStatus() {
    return useContext(KitchenStatusContext);
}

export function KitchenStatusProvider({
                                          locale,
                                          isShiftOpen,
                                          children,
                                      }: {
    locale: string;
    isShiftOpen: boolean;
    children: ReactNode;
}) {
    const [showClosed, setShowClosed] = useState(false);

    function requireShiftOpen() {
        if (isShiftOpen) return true;

        setShowClosed(true);
        return false;
    }

    return (
        <KitchenStatusContext.Provider value={{ isShiftOpen, requireShiftOpen }}>
            {children}

            <KitchenClosedModal
                locale={locale}
                open={showClosed}
                onClose={() => setShowClosed(false)}
            />
        </KitchenStatusContext.Provider>
    );
}
