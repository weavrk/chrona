<?php
/**
 * Save events to public/data/events-{username}.json
 * POST /api/save_events.php
 * Body: { "username": string, "events": array }
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

if (!$data || !isset($data['username']) || !isset($data['events'])) {
    http_response_code(400);
    echo json_encode(['error' => 'username and events are required']);
    exit;
}

$username = $data['username'];
$events = $data['events'];

// Get the absolute path to the project root
$projectRoot = dirname(dirname(__FILE__));

// Ensure the data directory exists
$dataDir = $projectRoot . '/public/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Save to public/data/events-{username}.json (for production access)
$publicFilePath = $dataDir . '/events-' . $username . '.json';
$jsonString = json_encode($events, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
$result = file_put_contents($publicFilePath, $jsonString);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save events']);
    exit;
}

// Also save to src/data/events-{username}.json (for development consistency)
$srcDataDir = $projectRoot . '/src/data';
if (is_dir($srcDataDir)) {
    $srcFilePath = $srcDataDir . '/events-' . $username . '.json';
    file_put_contents($srcFilePath, $jsonString);
}

echo json_encode([
    'success' => true,
    'message' => 'Events saved successfully'
]);

