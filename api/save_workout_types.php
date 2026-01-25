<?php
/**
 * Save workout types to public/data/{username}/workout-type-wo-{username}.json
 * POST /api/save_workout_types.php
 * Body: { "username": string, "workoutTypes": array }
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

if (!$data || !isset($data['username']) || !isset($data['workoutTypes'])) {
    http_response_code(400);
    echo json_encode(['error' => 'username and workoutTypes are required']);
    exit;
}

$username = $data['username'];
$workoutTypes = $data['workoutTypes'];

// Get the absolute path to the project root
$projectRoot = dirname(dirname(__FILE__));

// Ensure the user data directory exists
$publicUserDir = $projectRoot . '/public/data/' . $username;
if (!is_dir($publicUserDir)) {
    mkdir($publicUserDir, 0755, true);
}

// Save to public/data/{username}/workout-type-wo-{username}.json (for production access)
$publicFilePath = $publicUserDir . '/workout-type-wo-' . $username . '.json';
$jsonString = json_encode($workoutTypes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
$result = file_put_contents($publicFilePath, $jsonString);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save workout types']);
    exit;
}

// Also save to src/data/{username}/workout-type-wo-{username}.json (for development consistency)
$srcUserDir = $projectRoot . '/src/data/' . $username;
if (!is_dir($srcUserDir)) {
    mkdir($srcUserDir, 0755, true);
}
$srcFilePath = $srcUserDir . '/workout-type-wo-' . $username . '.json';
file_put_contents($srcFilePath, $jsonString);

echo json_encode([
    'success' => true,
    'message' => 'Workout types saved successfully'
]);

