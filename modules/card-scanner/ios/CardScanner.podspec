Pod::Spec.new do |s|
  s.name           = 'CardScanner'
  s.version        = '1.0.0'
  s.summary        = 'Scans Magic cards with the iPhone camera for Kartičky.'
  s.description    = 'Opens the system document camera (it finds the card edges and straightens it), then reads the text on each card with Vision in any language and returns small straightened pixels for artwork matching.'
  s.license        = 'MIT'
  s.author         = 'Kartičky'
  s.homepage       = 'https://karticky.pages.dev'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'VisionKit', 'Vision'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
