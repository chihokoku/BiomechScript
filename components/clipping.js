export function clipping() {
  // シーンの設定
  const scene2 = new THREE.Scene();

  // レンダラー2の設定
  const canvas2 = document.querySelector("#canvas2");
  const renderer2 = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas2,
  });
  renderer2.setSize(800, 500);
  renderer2.localClippingEnabled = true;

  // // カメラ2の設定
  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 1000;

  // カメラ2の設定
  const camera2 = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera2.position.set(300, 300, -300);

  //カメラ2のコントロールができるようにする(オービットコントロールを作成)
  const controls2 = new THREE.OrbitControls(camera2, canvas2);
  controls2.enableDamping = true; // 慣性の有効化
  controls2.dampingFactor = 0.25;

  // 設定されたシーン、レンダラー、カメラ、コントロールを返す
  return { scene2, renderer2, camera2, controls2 };
}
