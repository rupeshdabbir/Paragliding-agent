import { useState, useCallback } from 'react';

const STORAGE_KEY = 'skypilot_pilot_profile';

export const PROFILE_OPTIONS = {
    certification: [
        { value: 'student', label: 'Student', emoji: '🎓', desc: 'In training' },
        { value: 'p2', label: 'P2', emoji: '🪂', desc: 'Novice' },
        { value: 'p3', label: 'P3', emoji: '⛰️', desc: 'Intermediate' },
        { value: 'p4', label: 'P4', emoji: '🦅', desc: 'Advanced' },
        { value: 'comp', label: 'Comp', emoji: '🏆', desc: 'Competition' },
    ],
    flyingStyle: [
        { value: 'thermal', label: 'Thermalling', emoji: '☀️' },
        { value: 'ridge', label: 'Ridge Soaring', emoji: '🌊' },
        { value: 'xc', label: 'Cross Country', emoji: '🗺️' },
        { value: 'hike', label: 'Hike & Fly', emoji: '🥾' },
    ],
    wingType: [
        { value: 'a', label: 'Beginner (A)', emoji: '🟢' },
        { value: 'b', label: 'Intermediate (B)', emoji: '🟡' },
        { value: 'c', label: 'Advanced (C/D)', emoji: '🔴' },
    ],
    experience: [
        { value: 'lt50', label: '< 50hrs', emoji: '🌱' },
        { value: '50_200', label: '50–200hrs', emoji: '📈' },
        { value: '200_500', label: '200–500hrs', emoji: '💪' },
        { value: 'gt500', label: '500+hrs', emoji: '⚡' },
    ],
};

export function getDefaultProfile() {
    return { certification: '', flyingStyle: '', wingType: '', experience: '' };
}

export function isProfileComplete(profile) {
    if (!profile) return false;
    return !!(profile.certification && profile.flyingStyle && profile.wingType && profile.experience);
}

/**
 * Builds a compact profile summary string for display badges, eg:
 * "P3 · Ridge Soaring · Intermediate (B) · 200–500hrs"
 */
export function formatProfileSummary(profile) {
    if (!profile || !isProfileComplete(profile)) return null;

    const cert = PROFILE_OPTIONS.certification.find(o => o.value === profile.certification)?.label || profile.certification;
    const style = PROFILE_OPTIONS.flyingStyle.find(o => o.value === profile.flyingStyle)?.label || profile.flyingStyle;
    const wing = PROFILE_OPTIONS.wingType.find(o => o.value === profile.wingType)?.label || profile.wingType;
    const exp = PROFILE_OPTIONS.experience.find(o => o.value === profile.experience)?.label || profile.experience;

    return `${cert} · ${style} · ${wing} · ${exp}`;
}

/**
 * Builds the string injected into Gemini prompts.
 */
export function buildProfilePromptBlock(profile) {
    if (!profile || !isProfileComplete(profile)) return '';

    const cert = PROFILE_OPTIONS.certification.find(o => o.value === profile.certification)?.label || profile.certification;
    const certDesc = PROFILE_OPTIONS.certification.find(o => o.value === profile.certification)?.desc || '';
    const style = PROFILE_OPTIONS.flyingStyle.find(o => o.value === profile.flyingStyle)?.label || profile.flyingStyle;
    const wing = PROFILE_OPTIONS.wingType.find(o => o.value === profile.wingType)?.label || profile.wingType;
    const exp = PROFILE_OPTIONS.experience.find(o => o.value === profile.experience)?.label || profile.experience;

    // Build thresholds guidance for the AI
    let thresholdGuidance = '';
    if (profile.certification === 'student' || profile.certification === 'p2') {
        thresholdGuidance = 'Apply CONSERVATIVE thresholds: flag MARGINAL for winds > 10mph, NO-GO for > 13mph or gusts > 15mph. Emphasize safety callouts and recommend supervised flying.';
    } else if (profile.certification === 'p3') {
        thresholdGuidance = 'Apply STANDARD thresholds. Provide nuanced analysis and identify good learning windows.';
    } else if (profile.certification === 'p4' || profile.certification === 'comp') {
        thresholdGuidance = 'Apply EXPERIENCED thresholds. Include XC route potential, thermal cycle strength, cross-country window analysis, and technical ridge soaring considerations.';
    }

    return `
PILOT PROFILE (personalize your analysis for this specific pilot):
- Certification: ${cert}${certDesc ? ` (${certDesc})` : ''}
- Flying Style: ${style}
- Wing Type: ${wing}
- Flight Hours: ${exp}
- Guidance: ${thresholdGuidance}
Adjust safety notes, recommended windows, and GO/MARGINAL thresholds in your analysis to match this pilot's skill level.`;
}

/**
 * Builds a compact hash of the profile for use in cache keys.
 */
export function profileCacheKey(profile) {
    if (!profile || !isProfileComplete(profile)) return 'default';
    return `${profile.certification}_${profile.flyingStyle}_${profile.wingType}_${profile.experience}`;
}

export function usePilotProfile() {
    const [profile, setProfile] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : getDefaultProfile();
        } catch {
            return getDefaultProfile();
        }
    });

    const saveProfile = useCallback((newProfile) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
        setProfile(newProfile);
    }, []);

    const clearProfile = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setProfile(getDefaultProfile());
    }, []);

    return {
        profile,
        saveProfile,
        clearProfile,
        hasProfile: isProfileComplete(profile),
        summary: formatProfileSummary(profile),
    };
}
