<?php
/**
 * Save chip labels to public/data/chip-labels.json
 * POST /api/save_chip_labels.php
 * Body: { "labels": array }
 * Returns: { "success": true, "message": string }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['labels'])) {
    http_response_code(400);
    echo json_encode(['error' => 'labels are required']);
    exit;
}

$labels = $data['labels'];

// Get the absolute path to the project root
$projectRoot = dirname(dirname(__FILE__));

// Ensure the data directory exists
$dataDir = $projectRoot . '/public/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Save to public/data/chip-labels.json (for production access)
$publicFilePath = $dataDir . '/chip-labels.json';
$jsonString = json_encode($labels, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
$result = file_put_contents($publicFilePath, $jsonString);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save chip labels']);
    exit;
}

// Also save to src/data/chip-labels.json (for development consistency)
$srcDataDir = $projectRoot . '/src/data';
if (is_dir($srcDataDir)) {
    $srcFilePath = $srcDataDir . '/chip-labels.json';
    file_put_contents($srcFilePath, $jsonString);
}

echo json_encode([
    'success' => true,
    'message' => 'Chip labels saved successfully'
]);

