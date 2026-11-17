export async function calculateDrivingDistance(
  origin: string,
  destination: string,
): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY não configurada.");
  }

  if (!origin.trim() || !destination.trim()) {
    throw new Error("Endereço de origem ou destino inválido.");
  }

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: {
          address: origin,
        },
        destination: {
          address: destination,
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        languageCode: "pt-BR",
        regionCode: "BR",
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Google Routes API:", error);
    throw new Error("Não foi possível calcular a rota.");
  }

  const data = await response.json();

  const meters = data.routes?.[0]?.distanceMeters;

  if (typeof meters !== "number" || meters <= 0) {
    throw new Error("Não foi encontrada uma rota válida.");
  }

  return meters / 1000;
}
