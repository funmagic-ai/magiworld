/**
 * Replicate API Adapter for Point Editor
 *
 * Bridges Replicate's vggt-1b output to point_editor's expected format,
 * adding dither mask support for laser engraving.
 */

import { applyDitherToWorldPoints, createDitherMaskData } from './dither_utils.js';

/**
 * Fetch point cloud data from Replicate and convert to point_editor format
 *
 * @param {string} imageUrl - URL or base64 of the image
 * @param {Object} options - Processing options
 * @param {number} options.density - Point density for dithering (0.0-1.0, default 0.5)
 * @param {string} options.ditherMethod - 'bayer' or 'floyd-steinberg'
 * @param {number} options.confidenceThreshold - Minimum confidence to include point
 * @returns {Promise<Object>} - Data in point_editor format
 */
export async function fetchFromReplicate(imageUrl, options = {}) {
    const {
        density = 0.5,
        ditherMethod = 'bayer',
        confidenceThreshold = 0.1
    } = options;

    // Call your API endpoint that wraps Replicate
    // This should be an endpoint in your Next.js app
    const response = await fetch('/api/tools/3d-crystal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUrl }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch from Replicate');
    }

    const result = await response.json();

    // Check if we got raw world_points (need to fetch JSON)
    if (result.data?.predictionsUrl) {
        return await processReplicatePredictions(
            result.data.predictionsUrl,
            { density, ditherMethod, confidenceThreshold }
        );
    }

    // If we already have flattened points, apply dithering
    if (result.data?.points) {
        // Points are already flattened, just return them
        // Dithering would need to be applied differently here
        return {
            points: result.data.points,
            confidences: result.data.confidences || [],
            glbUrl: result.data.glbUrl
        };
    }

    throw new Error('Unexpected response format from API');
}

/**
 * Process raw Replicate predictions JSON and apply dithering
 *
 * @param {string} predictionsUrl - URL to the predictions JSON
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processed data with dithering applied
 */
export async function processReplicatePredictions(predictionsUrl, options = {}) {
    const {
        density = 0.5,
        ditherMethod = 'bayer',
        confidenceThreshold = 0.1
    } = options;

    // Fetch the raw predictions
    const response = await fetch(predictionsUrl);
    if (!response.ok) {
        throw new Error('Failed to fetch predictions JSON');
    }

    const predictions = await response.json();

    // vggt-1b returns world_points as 2D grid [H, W, 3]
    if (!predictions.world_points || !Array.isArray(predictions.world_points)) {
        throw new Error('No world_points in predictions');
    }

    const worldPoints = predictions.world_points;
    const worldPointsConf = predictions.world_points_conf || [];

    // Apply dithering to get filtered points
    const { points, confidences, ditherMask } = applyDitherToWorldPoints(
        worldPoints,
        worldPointsConf,
        density,
        ditherMethod
    );

    // Additional confidence filtering
    const filteredPoints = [];
    const filteredConfidences = [];

    for (let i = 0; i < points.length; i++) {
        if (confidences[i] >= confidenceThreshold) {
            filteredPoints.push(points[i]);
            filteredConfidences.push(confidences[i]);
        }
    }

    const height = worldPoints.length;
    const width = worldPoints[0]?.length || 0;

    return {
        // Point data (matches createRealPointCloud requirements)
        points: filteredPoints,
        confidences: filteredConfidences,

        // Metadata
        width,
        height,
        pointCount: filteredPoints.length,

        // Dither mask (for reference/debugging)
        ditherMask: createDitherMaskData(ditherMask, width, height),

        // Original grid dimensions (useful for reprocessing)
        originalShape: [height, width]
    };
}

/**
 * Convert Replicate data to point_editor's parsedData format
 * This makes it compatible with existing point_editor workflows
 *
 * @param {Object} replicateData - Data from processReplicatePredictions
 * @returns {Object} - Format compatible with point_editor's loadPointCloud
 */
export function toPointEditorFormat(replicateData) {
    const { points, confidences, ditherMask, width, height } = replicateData;

    // Create depth_map from Z values (for compatibility)
    const depthMap = new Float32Array(width * height);
    const confidenceMap = new Float32Array(width * height);

    // Note: This is a simplified conversion - the original grid structure is lost
    // For full compatibility, you'd need to preserve the grid mapping

    return {
        depth_map: {
            data: depthMap,
            shape: [height, width]
        },
        confidence_map: {
            data: confidenceMap,
            shape: [height, width]
        },
        dither_mask: ditherMask,

        // Direct point data (preferred for Replicate)
        world_points: {
            points,
            confidences
        }
    };
}

/**
 * Direct integration with PointCloudManager
 * Call this instead of createPointCloudFromData when using Replicate
 *
 * @param {PointCloudManager} pointCloudManager - The point cloud manager instance
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} replicateData - Data from processReplicatePredictions
 * @param {THREE.TransformControls} transformControls - Optional transform controls
 * @param {boolean} mouseControlEnabled - Whether mouse control is enabled
 */
export function createPointCloudFromReplicate(
    pointCloudManager,
    scene,
    replicateData,
    transformControls = null,
    mouseControlEnabled = false
) {
    const { points, confidences } = replicateData;

    // Use the existing createRealPointCloud method
    return pointCloudManager.createRealPointCloud(
        scene,
        points,
        confidences,
        transformControls,
        mouseControlEnabled
    );
}
