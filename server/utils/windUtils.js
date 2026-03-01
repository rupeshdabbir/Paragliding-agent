/**
 * Wind utility functions for paragliding condition analysis
 */

/**
 * Convert wind degrees (0-360) to cardinal direction
 */
export function degreesToCardinal(degrees) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

/**
 * Get the site's wind rating for the current wind direction (0, 1, or 2)
 * 0 = not suitable, 1 = marginal, 2 = good
 */
export function getSiteWindScore(siteProperties, windDegrees) {
  const cardinal = degreesToCardinal(windDegrees);
  const score = parseInt(siteProperties[cardinal] || '0', 10);
  return score;
}

/**
 * Determine if wind speed is flyable based on site type
 * Soaring: Needs 10-25 mph, gusts < 30
 * Thermaling: Needs 0-16 mph, gusts < 24
 * Default: Needs 4-25 mph, gusts < 31
 */
export function isWindSpeedFlyable(speedMph, gustsMph, siteTypes = {}) {
  let minSpeed = 3;
  let maxSpeed = 25;
  let maxGusts = 31;
  let siteProfile = 'general paragliding';

  if (siteTypes.thermaling && !siteTypes.ridgeSoaring) {
    minSpeed = 0; // Can launch in nil wind for thermaling
    maxSpeed = 16; // Strong winds + thermals = blowback
    maxGusts = 24;
    siteProfile = 'thermaling';
  } else if (siteTypes.ridgeSoaring && !siteTypes.thermaling) {
    minSpeed = 10; // Need more wind to stay up
    maxSpeed = 25;
    maxGusts = 30;
    siteProfile = 'ridge soaring';
  }

  const tooCalm = speedMph < minSpeed;
  const tooStrong = speedMph > maxSpeed;
  const gustsTooStrong = gustsMph > maxGusts;

  if (gustsTooStrong) return { flyable: false, category: 'DANGEROUS_GUSTS', reason: `Gusts of ${gustsMph.toFixed(0)} mph are too strong for ${siteProfile} (limit: ${maxGusts} mph)` };
  if (tooStrong) return { flyable: false, category: 'TOO_STRONG', reason: `Wind speed ${speedMph.toFixed(0)} mph is too strong for ${siteProfile} (limit: ${maxSpeed} mph)` };
  if (tooCalm) return { flyable: false, category: 'TOO_CALM', reason: `Wind speed ${speedMph.toFixed(0)} mph is too light for ${siteProfile} (minimum: ${minSpeed} mph)` };

  if (speedMph > maxSpeed * 0.75) return { flyable: true, category: 'STRONG', reason: `Wind ${speedMph.toFixed(0)} mph — strong for ${siteProfile}, experienced pilots only` };
  if (speedMph > minSpeed + 2) return { flyable: true, category: 'MODERATE', reason: `Wind ${speedMph.toFixed(0)} mph — good moderate conditions for ${siteProfile}` };
  return { flyable: true, category: 'LIGHT', reason: `Wind ${speedMph.toFixed(0)} mph — light conditions for ${siteProfile}` };
}

/**
 * Convert m/s to mph
 */
export function msToMph(ms) {
  return ms * 2.237;
}

/**
 * Score overall flying conditions: GO, MARGINAL, NO_GO
 */
export function scoreFlyingConditions({ windScore, windCheck, cloudCover, visibility, precipitation }) {
  const issues = [];
  const positives = [];

  // Wind direction check
  if (windScore === 0) {
    issues.push('Wind direction not suitable for this site');
  } else if (windScore === 1) {
    issues.push('Wind direction is marginal for this site');
  } else {
    positives.push('Wind direction is ideal for this site');
  }

  // Wind speed check
  if (!windCheck.flyable) {
    issues.push(windCheck.reason);
  } else {
    positives.push(windCheck.reason);
  }

  // Cloud cover
  if (cloudCover > 85) {
    issues.push(`Heavy cloud cover (${cloudCover}%) may indicate instability`);
  } else if (cloudCover > 60) {
    issues.push(`Moderate cloud cover (${cloudCover}%)`);
  } else {
    positives.push(`Good visibility with ${cloudCover}% cloud cover`);
  }

  // Visibility
  if (visibility < 3218) {
    issues.push(`Visibility too low (${(visibility / 1609.34).toFixed(1)} mi)`);
  } else if (visibility < 8046) {
    issues.push(`Reduced visibility (${(visibility / 1609.34).toFixed(1)} mi)`);
  } else {
    positives.push(`Excellent visibility (${(visibility / 1609.34).toFixed(1)} mi)`);
  }

  // Precipitation
  if (precipitation > 0.5) {
    issues.push(`Active precipitation (${precipitation.toFixed(1)} mm/h) — do not fly`);
  } else if (precipitation > 0) {
    issues.push(`Light precipitation detected (${precipitation.toFixed(2)} mm/h)`);
  } else {
    positives.push('No precipitation');
  }

  // Determine overall rating
  const criticalIssues = issues.filter(i =>
    i.includes('precipitation') && !i.includes('Light') ||
    i.includes('DANGEROUS') ||
    i.includes('Visibility too low') ||
    (i.includes('not suitable') && !windCheck.flyable)
  );

  let rating;
  if (criticalIssues.length > 0 || (!windCheck.flyable && windScore === 0)) {
    rating = 'NO_GO';
  } else if (issues.length >= 2 || windScore === 0 || !windCheck.flyable) {
    rating = 'NO_GO';
  } else if (issues.length === 1 || windScore === 1) {
    rating = 'MARGINAL';
  } else {
    rating = 'GO';
  }

  return { rating, issues, positives };
}
