<?php
/**
 * Save user labels to public/data/{username}/label-list-user-{username}.json
 * POST /api/save_user_labels.php
 * Body: { "username": string, "labels": array }
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

if (!$data || !isset($data['username']) || !isset($data['labels'])) {
    http_response_code(400);
    echo json_encode(['error' => 'username and labels are required']);
    exit;
}

$username = $data['username'];
$labels = $data['labels'];

// Get the absolute path to the project root
$projectRoot = dirname(dirname(__FILE__));

// Ensure the user data directory exists
$publicUserDir = $projectRoot . '/public/data/' . $username;
if (!is_dir($publicUserDir)) {
    mkdir($publicUserDir, 0755, true);
}

// Save to public/data/{username}/label-list-user-{username}.json (for production access)
$publicFilePath = $publicUserDir . '/label-list-user-' . $username . '.json';
$jsonString = json_encode($labels, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
$result = file_put_contents($publicFilePath, $jsonString);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save user labels']);
    exit;
}

// Also save to src/data/{username}/label-list-user-{username}.json (for development consistency)
$srcUserDir = $projectRoot . '/src/data/' . $username;
if (!is_dir($srcUserDir)) {
    mkdir($srcUserDir, 0755, true);
}
$srcFilePath = $srcUserDir . '/label-list-user-' . $username . '.json';
file_put_contents($srcFilePath, $jsonString);

echo json_encode([
    'success' => true,
    'message' => 'User labels saved successfully'
]);

