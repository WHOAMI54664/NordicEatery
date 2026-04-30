import Image from "next/image";

export function PaymentIcons() {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-14 items-center justify-center rounded-xl border border-dark/10 bg-white/70 px-2">
                <Image
                    src="/payments/applepay.svg"
                    alt="Apple Pay"
                    width={40}
                    height={20}
                />
            </div>

            <div className="flex h-9 w-14 items-center justify-center rounded-xl border border-dark/10 bg-white/70 px-2">
                <Image
                    src="/payments/mastercard.svg"
                    alt="Mastercard"
                    width={36}
                    height={20}
                />
            </div>

            <div className="flex h-9 w-14 items-center justify-center rounded-xl border border-dark/10 bg-white/70 px-2">
                <Image
                    src="/payments/swish.svg"
                    alt="Swish"
                    width={36}
                    height={20}
                />
            </div>

            <div className="flex h-9 w-14 items-center justify-center rounded-xl border border-dark/10 bg-white/70 px-2">
                <Image
                    src="/payments/visa.svg"
                    alt="Swish"
                    width={36}
                    height={20}
                />
            </div>
        </div>
    );
}