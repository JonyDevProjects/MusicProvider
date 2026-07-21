//! Build script for ytdlp_native
//! 
//! This script generates the Flutter Rust Bridge bindings.

fn main() {
    // Set up environment for flutter_rust_bridge
    println!("cargo:rerun-if-changed=src/");
    
    // Configure for mobile platforms
    #[cfg(target_os = "android")]
    {
        println!("cargo:rustc-link-lib=dylib=c++");
    }
    
    #[cfg(target_os = "ios")]
    {
        println!("cargo:rustc-link-lib=framework=Security");
        println!("cargo:rustc-link-lib=framework=SystemConfiguration");
    }
}