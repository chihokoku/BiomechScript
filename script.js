window.addEventListener("DOMContentLoaded", init);

function init() {
  console.log("Hello World!");

  const canvas = document.querySelector("#c");

  // レンダラーの設定
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  const width = 960;
  const height = 540;
  renderer.setSize(width, height);

  // カメラの設定
  const fov = 75;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  // シーンの設定
  const scene = new THREE.Scene();

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });

  const cube = new THREE.Mesh(geometry, material);

  scene.add(cube);
  // renderer.render(scene, camera);

  // ライトを追加
  const color = 0xffffff;
  const intensity = 3;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);

  tick();

  function tick() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);

    requestAnimationFrame(tick);
  }
}
