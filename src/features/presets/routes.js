/**
 * Preset Routes
 * 
 * API routes for preset management and execution
 */

import express from 'express';
import {
  listPresets,
  getPresetInfo,
  createPreset,
  updatePreset,
  deletePreset,
  executePreset,
  validatePreset
} from './controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/presets:
 *   get:
 *     tags: [Presets]
 *     summary: List all presets
 *     description: Retrieve a list of all available presets with validation status
 *     responses:
 *       200:
 *         description: Preset listing retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PresetListResult'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   post:
 *     tags: [Presets]
 *     summary: Create new preset
 *     description: Create a new preset with commands or file references
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - commands
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique preset name
 *                 example: "drill_cycle"
 *               commands:
 *                 oneOf:
 *                   - type: string
 *                     description: Single command or file path
 *                   - type: array
 *                     items:
 *                       type: string
 *                     description: Array of commands or file paths
 *                 example: ["G0 Z5", "G1 Z-5 F100", "G0 Z5"]
 *               description:
 *                 type: string
 *                 description: Optional preset description
 *               type:
 *                 type: string
 *                 enum: [commands, file, mixed]
 *                 default: commands
 *                 description: Preset type hint
 *     responses:
 *       200:
 *         description: Preset created successfully
 *       400:
 *         description: Invalid input or preset already exists
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', listPresets);
router.post('/', createPreset);

/**
 * @swagger
 * /api/v1/presets/{presetName}:
 *   get:
 *     tags: [Presets]
 *     summary: Get preset information
 *     description: Retrieve detailed information about a specific preset
 *     parameters:
 *       - in: path
 *         name: presetName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the preset
 *     responses:
 *       200:
 *         description: Preset information retrieved successfully
 *       404:
 *         description: Preset not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   put:
 *     tags: [Presets]
 *     summary: Update preset
 *     description: Update an existing preset's commands or configuration
 *     parameters:
 *       - in: path
 *         name: presetName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the preset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commands
 *             properties:
 *               commands:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [commands, file, mixed]
 *     responses:
 *       200:
 *         description: Preset updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Preset not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   delete:
 *     tags: [Presets]
 *     summary: Delete preset
 *     description: Delete a preset from the system
 *     parameters:
 *       - in: path
 *         name: presetName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the preset
 *       - in: query
 *         name: backup
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include preset definition in response for backup
 *     responses:
 *       200:
 *         description: Preset deleted successfully
 *       404:
 *         description: Preset not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:presetName', getPresetInfo);
router.put('/:presetName', updatePreset);
router.delete('/:presetName', deletePreset);

/**
 * @swagger
 * /api/v1/presets/{presetName}/execute:
 *   post:
 *     tags: [Presets]
 *     summary: Execute preset
 *     description: Execute all commands in a preset on the connected machine
 *     parameters:
 *       - in: path
 *         name: presetName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the preset to execute
 *     responses:
 *       200:
 *         description: Preset execution completed
 *       400:
 *         description: Machine not connected
 *       404:
 *         description: Preset not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/:presetName/execute', executePreset);

/**
 * @swagger
 * /api/v1/presets/{presetName}/validate:
 *   post:
 *     tags: [Presets]
 *     summary: Validate preset
 *     description: Validate preset commands without executing them
 *     parameters:
 *       - in: path
 *         name: presetName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the preset to validate
 *     responses:
 *       200:
 *         description: Preset validation completed
 *       404:
 *         description: Preset not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/:presetName/validate', validatePreset);

export default router;