$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$taskAudioRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../test-results/wechat/audio'))
$taskPhrases = Get-Content -LiteralPath (Join-Path $taskAudioRoot 'phrases.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskFormat = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
try {
  $taskCount = 0
  foreach ($taskPhrase in $taskPhrases) {
    $taskOutput = Join-Path $taskAudioRoot ($taskPhrase.id + '.wav')
    if (!(Test-Path -LiteralPath $taskOutput)) {
      $taskVoice.SelectVoice($(if ($taskPhrase.locale -eq 'en') { 'Microsoft Zira Desktop' } else { 'Microsoft Huihui Desktop' }))
      $taskVoice.Rate = 0
      $taskVoice.SetOutputToWaveFile($taskOutput, $taskFormat)
      $taskVoice.Speak($taskPhrase.text)
      $taskVoice.SetOutputToNull()
    }
    $taskCount++
    if ($taskCount % 100 -eq 0) { Write-Output "Recorded $taskCount / $($taskPhrases.Count)" }
  }
} finally { $taskVoice.Dispose() }
