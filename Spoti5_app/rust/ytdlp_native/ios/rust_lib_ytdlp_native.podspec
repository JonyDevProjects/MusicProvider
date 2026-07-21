Pod::Spec.new do |s|
  s.name             = 'rust_lib_ytdlp_native'
  s.version          = '0.1.0'
  s.summary          = 'Native yt-dlp wrapper for Flutter via flutter_rust_bridge'
  s.description      = 'Native yt-dlp wrapper for Flutter via flutter_rust_bridge'
  s.homepage         = 'https://github.com/nuclearplayer/nuclear'
  s.license          = { :type => 'MIT', :file => '../LICENSE' }
  s.author           = { 'Jonathan Quishpe' => 'jonathan@example.com' }
  s.source           = { :path => '.' }
  s.source_files     = 'Classes/**/*'
  s.dependency 'Flutter'
  s.platform         = :ios, '12.0'

  s.static_framework = true

  # Flutter.framework does not contain a i386 slice.
  s.swift_version = '5.0'

  # Link the Rust static library
  s.vendored_libraries = 'libytdlp_native.a'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386',
    'OTHER_LDFLAGS' => '-force_load $(PODS_TARGET_SRCROOT)/libytdlp_native.a -lSystem -lc++ -framework Security -framework SystemConfiguration'
  }
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '-force_load ${PODS_ROOT}/../.symlinks/plugins/rust_lib_ytdlp_native/ios/libytdlp_native.a -lSystem -lc++ -framework Security -framework SystemConfiguration'
  }
end
