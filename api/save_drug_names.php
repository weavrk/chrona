<?php
/**
 * Save drug names to public/data/drug-names-{type}-{username}.json
 * POST /api/save_drug_names.php
 * Body: { "username": string, "type": "hr" | "hs", "drugNames": array }
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

if (!$data || !isset($data['username']) || !isset($data['type']) || !isset($data['drugNames'])) {
    http_response_code(400);
    echo json_encode(['error' => 'username, type and drugNames are required']);
    exit;
}

$username = $data['username'];
$type = $data['type'];
$drugNames = $data['drugNames'];

if (!in_array($type, ['hr', 'hs'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid type. Must be "hr" or "hs"']);
    exit;
}

// Get the absolute path to the project root
$projectRoot = dirname(dirname(__FILE__));

// Ensure the data directory exists
$dataDir = $projectRoot . '/public/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Save to public/data/drug-names-{type}-{username}.json (for production access)
$publicFilePath = $dataDir . '/drug-names-' . $type . '-' . $username . '.json';
$jsonString = json_encode($drugNames, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
$result = file_put_contents($publicFilePath, $jsonString);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save drug names']);
    exit;
}

// Also save to src/data/drug-names-{type}-{username}.json (for development consistency)
$srcDataDir = $projectRoot . '/src/data';
if (!is_dir($srcDataDir)) {
    mkdir($srcDataDir, 0755, true);
}
$srcFilePath = $srcDataDir . '/drug-names-' . $type . '-' . $username . '.json';
file_put_contents($srcFilePath, $jsonString);

echo json_encode([
    'success' => true,
    'message' => 'Drug names saved successfully'
]);

