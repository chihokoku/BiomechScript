window.addEventListener("DOMContentLoaded", init);

function init() {
  const canvas = document.querySelector("#c");

  // レンダラーの設定
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  const width = 800;
  const height = 500;
  renderer.setSize(width, height);

  // カメラの設定
  const fov = 75;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 500;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 100;

  // シーンの設定
  const scene = new THREE.Scene();

  // カメラコントロールができるようにする(オービットコントロールを作成)
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true; // 慣性の有効化
  controls.dampingFactor = 0.25;

  // ファイル入力要素の取得
  const fileInput = document.getElementById("fileInput");
  // ファイルが選択されたときの処理
  fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const contents = e.target.result;

        // OBJLoaderで読み込み
        const objLoader = new THREE.OBJLoader();
        const object = objLoader.parse(contents);
        object.position.set(0, 0, 0);
        scene.add(object);
      };
      reader.readAsText(file);
    }
  });

  // ボタン要素の取得
  const z_length_btn = document.getElementById("z_length_btn");
  // ボタンがクリックされたときの処理
  z_length_btn.addEventListener("click", function () {
    // sceneに追加された最後のオブジェクトを取得
    const object = scene.children[scene.children.length - 1];
    if (object) {
      calculate_z_length(object);
    } else {
      console.log("オブジェクトがまだ読み込まれていません。");
    }
  });
  // z軸方向の骨の長さを計算
  function calculate_z_length(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const min = boundingBox.min;
    // 骨の長さはz軸のマイナス方向の値なので絶対値にする処理を施す
    const z_length = Math.abs(min.z);
    // z軸方向の長さをhtmlファイル(ブラウザ)に表示
    const output_z_length = document.getElementById("z_length");
    output_z_length.innerHTML = `${z_length.toFixed(4)}`;
  }

  // function doSomethingWithObject(object) {
  //   if (object) {
  //     console.log("Object exists and can be used here:", object);
  //     // ここでobjectに対して何か操作を行う
  //   } else {
  //     console.log("Object is not loaded yet.");
  //   }
  // }

  // 環境光源を作成
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // 平行光源を作成
  const directionalLight = new THREE.DirectionalLight(0xffffff);
  directionalLight.intensity = 1;
  directionalLight.position.set(1, 10, 1);
  scene.add(directionalLight);

  // 座標軸の表示
  // new THREE.AxesHelper(軸の長さ);
  const axis = new THREE.AxesHelper(100);
  scene.add(axis);

  // 画面をレンダリング(アニメーション)
  tick();

  function tick() {
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(tick);
  }
}
