const {withAppBuildGradle}=require('expo/config-plugins');
module.exports=config=>withAppBuildGradle(config,mod=>{
 const marker='// StoreMate: shorten native object paths on Windows';
 if(process.platform==='win32'&&!mod.modResults.contents.includes(marker))mod.modResults.contents+=`\n${marker}
android {
 externalNativeBuild {
  cmake { buildStagingDirectory = file(System.getenv('STOREMATE_NATIVE_BUILD_ROOT') ?: new File(System.getProperty('java.io.tmpdir'), 'storemate-cmake').absolutePath) }
 }
 defaultConfig {
  externalNativeBuild { cmake { arguments '-DCMAKE_OBJECT_PATH_MAX=240' } }
 }
}
`;
 return mod;
});
