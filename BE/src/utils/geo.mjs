const EARTH_RADIUS_M = 6371000;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceM(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function resampleRoute(coordinates, spacingM = 1500) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return [];
  }

  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i += 1) {
    const [lng1, lat1] = coordinates[i - 1];
    const [lng2, lat2] = coordinates[i];
    cumulative.push(cumulative[i - 1] + haversineDistanceM(lat1, lng1, lat2, lng2));
  }

  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength <= 0) {
    const [lng, lat] = coordinates[0];
    return [{ lat, lng, segmentLengthM: 0 }];
  }

  const targetDistances = [0];
  for (let d = spacingM; d < totalLength; d += spacingM) {
    targetDistances.push(d);
  }
  if (targetDistances[targetDistances.length - 1] !== totalLength) {
    targetDistances.push(totalLength);
  }

  const samples = targetDistances.map((targetDist) => {
    let i = 1;
    while (i < cumulative.length && cumulative[i] < targetDist) i += 1;
    i = Math.min(i, coordinates.length - 1);

    const segStart = cumulative[i - 1];
    const segEnd = cumulative[i];
    const t = segEnd > segStart ? (targetDist - segStart) / (segEnd - segStart) : 0;

    const [lng1, lat1] = coordinates[i - 1];
    const [lng2, lat2] = coordinates[i];

    return {
      lat: lat1 + (lat2 - lat1) * t,
      lng: lng1 + (lng2 - lng1) * t,
      cumulativeM: targetDist,
    };
  });

  for (let i = 0; i < samples.length; i += 1) {
    const before = i === 0 ? 0 : (samples[i].cumulativeM - samples[i - 1].cumulativeM) / 2;
    const after = i === samples.length - 1 ? 0 : (samples[i + 1].cumulativeM - samples[i].cumulativeM) / 2;
    samples[i].segmentLengthM = before + after;
  }

  return samples;
}
