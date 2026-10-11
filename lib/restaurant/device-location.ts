import { parseCoordinates, type TruckCoordinates } from "./location";

// Called only by the operator's button. A single reading is kept in the form
// for address lookup and review; publication requires Save. No live tracking.
export function getDeviceLocation(
  geolocation: Pick<Geolocation, "getCurrentPosition"> | undefined,
): Promise<TruckCoordinates & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new Error("geolocationUnsupported"));
      return;
    }
    const timer = setTimeout(
      () => reject(new Error("geolocationTimeout")),
      20000,
    );
    try {
      geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timer);
          try {
            const coordinates = parseCoordinates(position.coords);
            if (!coordinates) throw new Error("invalidCoordinates");
            resolve({ ...coordinates, accuracy: position.coords.accuracy });
          } catch {
            reject(new Error("geolocationUnavailable"));
          }
        },
        (error) => {
          clearTimeout(timer);
          reject(
            new Error(
              error.code === 1
                ? "geolocationDenied"
                : error.code === 3
                  ? "geolocationTimeout"
                  : "geolocationUnavailable",
            ),
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } catch {
      clearTimeout(timer);
      reject(new Error("geolocationUnavailable"));
    }
  });
}
