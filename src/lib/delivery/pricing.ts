interface DeliveryRange {
  id: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  fee: number;
}

interface DeliveryPricingResult {
  available: boolean;
  distanceKm: number;
  fee: number | null;
  message: string;
}

export function calculateDeliveryFee(
  distanceKm: number,
  maxDistanceKm: number,
  ranges: DeliveryRange[],
): DeliveryPricingResult {
  if (
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(maxDistanceKm) ||
    distanceKm <= 0 ||
    maxDistanceKm <= 0
  ) {
    throw new Error("Distância inválida.");
  }

  const distance = Math.round(distanceKm * 100) / 100;

  if (distance > maxDistanceKm) {
    return {
      available: false,
      distanceKm: distance,
      fee: null,
      message: "Endereço fora da área de entrega.",
    };
  }

  const range =
    ranges
      .slice()
      .sort((a, b) => a.minDistanceKm - b.minDistanceKm)
      .find((item) => {
        return distance > item.minDistanceKm && distance <= item.maxDistanceKm;
      }) ?? ranges.find((item) => distance === item.minDistanceKm);

  if (!range) {
    return {
      available: false,
      distanceKm: distance,
      fee: null,
      message: "Não existe uma faixa configurada para essa distância.",
    };
  }

  return {
    available: true,
    distanceKm: distance,
    fee: range.fee,
    message: "Entrega disponível!",
  };
}
