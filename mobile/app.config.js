const base=require('./app.json');
module.exports=()=>{
 const projectId=process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
 const release=['preview','production'].includes(process.env.EAS_BUILD_PROFILE);
 const api=process.env.EXPO_PUBLIC_API_URL;
 if(release&&(!api||!/^https:\/\//.test(api)))throw new Error('설치 빌드에는 HTTPS EXPO_PUBLIC_API_URL이 필요합니다.');
 return {...base.expo,android:{...base.expo.android,...(process.env.GOOGLE_SERVICES_FILE?{googleServicesFile:process.env.GOOGLE_SERVICES_FILE}:{})},plugins:[...(base.expo.plugins||[]),'./plugins/withWindowsBuildPaths','expo-secure-store','expo-notifications',['expo-location',{locationWhenInUsePermission:'출근 시 매장 반경을 확인하려면 현재 위치 접근이 필요합니다.'}],['expo-media-library',{photosPermission:'저장한 매장 QR 이미지를 확인할 수 있습니다.',savePhotosPermission:'매장 초대 QR 이미지를 사진에 저장합니다.',granularPermissions:['photo']}],['expo-camera',{cameraPermission:'상품 바코드와 유통기한을 인식하려면 카메라 접근이 필요합니다.',recordAudioAndroid:false}]],extra:{...(base.expo.extra||{}),...(projectId?{eas:{projectId}}:{})}};
};
