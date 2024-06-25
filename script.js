window.addEventListener("DOMContentLoaded", init);

function init() {
  // シーンの設定
  const scene1 = new THREE.Scene();
  const scene2 = new THREE.Scene();

  // レンダラー1の設定
  const canvas1 = document.querySelector("#canvas1");
  const renderer1 = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas1,
  });
  const width = 800;
  const height = 500;
  renderer1.setSize(width, height);

  // レンダラー2の設定
  const canvas2 = document.querySelector("#canvas2");
  const renderer2 = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas2,
  });
  renderer2.setSize(800, 500);
  renderer2.localClippingEnabled = true;

  // カメラ1の設定
  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 500;
  const camera1 = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera1.position.set(0, 0, 100);
  // camera1.lookAt(0, 0, -2000);

  // カメラ1のコントロールができるようにする(オービットコントロールを作成)
  const controls1 = new THREE.OrbitControls(camera1, canvas1);
  controls1.enableDamping = true; // 慣性の有効化
  controls1.dampingFactor = 0.25;

  // カメラ2の設定
  const camera2 = new THREE.PerspectiveCamera(fov, aspect, near, 800);
  camera2.position.set(300, 300, -300);

  //カメラ2のコントロールができるようにする(オービットコントロールを作成)
  const controls2 = new THREE.OrbitControls(camera2, canvas2);
  controls2.enableDamping = true; // 慣性の有効化
  controls2.dampingFactor = 0.25;

  // カメラ座標を表示するHTML要素を取得
  const cameraPositionX = document.getElementById("cameraPositionX");
  const cameraPositionY = document.getElementById("cameraPositionY");
  const cameraPositionZ = document.getElementById("cameraPositionZ");

  // 環境光源を作成
  const ambientLight1 = new THREE.AmbientLight(0xffffff, 0.5);
  const ambientLight2 = new THREE.AmbientLight(0xffffff, 0.5);
  scene1.add(ambientLight1);
  scene2.add(ambientLight2);

  // 平行光源を作成
  const directionalLight1 = new THREE.DirectionalLight(0xffffff);
  directionalLight1.intensity = 1;
  directionalLight1.position.set(1, 10, 1);
  const directionalLight2 = new THREE.DirectionalLight(0xffffff);
  directionalLight2.intensity = 1;
  directionalLight2.position.set(1, 10, 1);
  scene1.add(directionalLight1);
  scene2.add(directionalLight2);

  // 座標軸の表示
  // new THREE.AxesHelper(軸の長さ);
  const axis1 = new THREE.AxesHelper(300);
  const axis2 = new THREE.AxesHelper(300);
  scene1.add(axis1);
  scene2.add(axis2);

  let object2;
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
        const object1 = objLoader.parse(contents);
        object2 = objLoader.parse(contents);
        object1.position.set(0, 0, 0);
        scene1.add(object1);
        object2.position.set(0, 0, 0);
        scene2.add(object2);
      };
      reader.readAsText(file);
    }
  });

  // ボタン要素の取得
  const z_length_btn = document.getElementById("z_length_btn");
  // ボタンがクリックされたときの処理
  z_length_btn.addEventListener("click", function () {
    // scene1に追加された最後のオブジェクトを取得
    const object = scene1.children[scene1.children.length - 1];
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

  // 断面の輪郭情報を格納する変数
  let clippedEdges = [];
  // clippingを使用して断面を取得する
  let clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  // clippingHelperを使用してどこでclippingしてるか可視化する
  const planeHelper = new THREE.PlaneHelper(clipPlane, 70, 0xff0000);
  scene2.add(planeHelper);
  // ボタンを押したら断面を取得
  const clipButton = document.getElementById("clipButton");
  clipButton.addEventListener("click", updateClipPlane);
  function updateClipPlane() {
    const zPosition = parseFloat(document.getElementById("zPosition").value);
    clipPlane.constant = zPosition;
    scene2.traverse((child) => {
      if (child.isMesh) {
        child.material.clippingPlanes = [clipPlane];
        child.material.clipIntersection = true;

        // クリッピングされたエッジを取得
        clippedEdges = getClippedEdges(child.geometry, clipPlane);
        drawClippedEdgesOnCanvas(
          clippedEdges,
          document.getElementById("canvas3")
        );
        console.log("輪郭点", clippedEdges);
      }
    });
  }

  // クリップされたエッジを取得する関数
  function getClippedEdges(geometry, plane) {
    const positions = geometry.attributes.position.array;
    const indices = geometry.index ? geometry.index.array : null;
    clippedEdges = [];
    if (indices) {
      // インデックスがある場合の処理
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];

        const vA = new THREE.Vector3(
          positions[a * 3],
          positions[a * 3 + 1],
          positions[a * 3 + 2]
        );
        const vB = new THREE.Vector3(
          positions[b * 3],
          positions[b * 3 + 1],
          positions[b * 3 + 2]
        );
        const vC = new THREE.Vector3(
          positions[c * 3],
          positions[c * 3 + 1],
          positions[c * 3 + 2]
        );

        const intersectionPoints = [];

        // 辺ABをチェック
        checkEdge(vA, vB, plane, intersectionPoints);
        // 辺BCをチェック
        checkEdge(vB, vC, plane, intersectionPoints);
        // 辺CAをチェック
        checkEdge(vC, vA, plane, intersectionPoints);

        if (intersectionPoints.length === 2) {
          clippedEdges.push(intersectionPoints);
        }
      }
    } else {
      // インデックスがない場合の処理
      for (let i = 0; i < positions.length; i += 9) {
        const vA = new THREE.Vector3(
          positions[i],
          positions[i + 1],
          positions[i + 2]
        );
        const vB = new THREE.Vector3(
          positions[i + 3],
          positions[i + 4],
          positions[i + 5]
        );
        const vC = new THREE.Vector3(
          positions[i + 6],
          positions[i + 7],
          positions[i + 8]
        );

        const intersectionPoints = [];

        // 辺ABをチェック
        checkEdge(vA, vB, plane, intersectionPoints);
        // 辺BCをチェック
        checkEdge(vB, vC, plane, intersectionPoints);
        // 辺CAをチェック
        checkEdge(vC, vA, plane, intersectionPoints);

        if (intersectionPoints.length === 2) {
          clippedEdges.push(intersectionPoints);
        }
      }
    }
    return clippedEdges;
  }
  // 辺の交点をチェックする関数
  function checkEdge(vA, vB, plane, intersectionPoints) {
    const dA = plane.distanceToPoint(vA);
    const dB = plane.distanceToPoint(vB);

    if (dA * dB < 0) {
      const t = dA / (dA - dB);
      const intersection = new THREE.Vector3().lerpVectors(vA, vB, t);
      intersectionPoints.push(intersection);
    }
  }

  // クリップされたエッジをキャンバスに描画する関数
  function drawClippedEdgesOnCanvas(edges, canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;

    // キャンバスの中心に描画するためのオフセット
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    const scale = 5; // スケールを調整して描画

    // 軸を描画
    drawAxesOnCanvas(ctx, offsetX, offsetY, canvas.width, canvas.height);

    ctx.strokeStyle = "#000000"; //黒色
    ctx.beginPath();
    edges.forEach((edge) => {
      const [p1, p2] = edge;
      // キャンバスの中心を原点とした座標系に変換して描画
      ctx.moveTo(p1.x * scale + offsetX, -p1.y * scale + offsetY);
      ctx.lineTo(p2.x * scale + offsetX, -p2.y * scale + offsetY);
    });
    ctx.stroke();
  }

  // x軸とy軸を描画する関数
  function drawAxesOnCanvas(ctx, offsetX, offsetY, width, height) {
    // x軸
    ctx.strokeStyle = "#FF0000"; // 赤色
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.stroke();

    // y軸
    ctx.strokeStyle = "#00FF00"; // 緑色
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();
  }

  // クリックで取得した座標を格納する配列
  const points = [];

  // クリックして座標を取得
  const canvas3 = document.getElementById("canvas3");
  const ctx = canvas3.getContext("2d");
  canvas3.addEventListener("click", function (event) {
    const rect = canvas3.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = x - canvas3.width / 2; // Canvasの中心のX座標
    const centerY = y - canvas3.height / 2; // Canvasの中心のY座標

    const relativeX = centerX / 5; // Canvas中心を原点とした相対X座標
    const relativeY = -(centerY / 5); // Canvas中心を原点とした相対Y座標

    points.push({ x: relativeX, y: relativeY });
    // 赤で円を描画
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    displayCoordinates();
    console.log(points);
    return points;
  });

  // 座標を表示する関数
  const coordinates = document.getElementById("coordinates");
  function displayCoordinates() {
    if (points.length > 0) {
      const latestPoint = points[points.length - 1];
      coordinates.innerHTML = `Latest Point: x=${latestPoint.x.toFixed(
        3
      )}, y=${latestPoint.y.toFixed(3)}`;
    }
  }

  // getContourボタンを押したら実行する
  const getContour = document.getElementById("getContour");
  getContour.addEventListener("click", function () {
    let maxYPoint = clippedEdges[0];
    for (let i = 1; i < clippedEdges.length; i++) {
      if (clippedEdges[i].y > maxYPoint.y) {
        maxYPoint = clippedEdges[i];
      }
    }
    findClosestArray(maxYPoint, clippedEdges);
    console.log("y座標が最も大きい点:", maxYPoint);
  });

  // 3次元座標間の距離を計算する関数
  function distance3D(point1, point2) {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) +
        Math.pow(point1.y - point2.y, 2) +
        Math.pow(point1.z - point2.z, 2)
    );
  }

  // 外輪郭を形成する点を格納する
  let outContour = [];
  // 配列Aから最も近い配列Bを探す関数
  function findClosestArray(arrayA, clippedEdges) {
    let minDistance = Infinity;

    // 最初の始点
    const [start1, start2] = arrayA;
    let [a1, a2] = arrayA;

    while (true) {
      let A = 0;
      [a1, a2] = findClosestpoint(minDistance, arrayA, [a1, a2]);
      A++;
      if (A >= 1000 || (a1 === start1 && a2 === start2)) {
        console.log("ループを終了します");
        console.log("外輪郭を形成する点", outContour);
        break;
      }
    }
  }

  function findClosestpoint(minDis, array, [a1, a2]) {
    let closestEdge = null; // 最も近いエッジを格納する変数

    clippedEdges.forEach((edge) => {
      // arrayは探索開始点
      //arrayとedgeが同じ配列でないことを確認
      if (array !== edge) {
        let [b1, b2] = edge;

        // arrayAの各点とedgeの各点の距離を計算
        let distances = [
          distance3D(a1, b1),
          distance3D(a1, b2),
          distance3D(a2, b1),
          distance3D(a2, b2),
        ];

        // 最小の距離を取得
        let minEdgeDistance = Math.min(...distances);

        if (minEdgeDistance < minDis) {
          minDis = minEdgeDistance;
          closestEdge = edge; // 最も近いエッジを更新
          outContour.push(closestEdge);
        }
      }
    });
    // if (closestEdge) {
    //   outContour.push(closestEdge); // 最も近いエッジをoutContourに追加
    // }
    return [a1, a2];
  }
  // // 外輪郭を形成する一点の配列Aを取得する関数
  // function getOuterContour(clippedEdges) {
  //   let outerContour = null;
  //   let maxDistance = -Infinity; // 最大距離を負の無限大で初期化

  //   // 外輪郭を形成する一点の配列を探索
  //   for (let i = 0; i < clippedEdges.length; i++) {
  //     const currentContour = clippedEdges[i];
  //     // ここで外輪郭を特定する条件を設定する（例えば、y座標が最大である、特定の範囲内にある等）
  //     // 仮にここではy座標が最大であるという条件で外輪郭を特定する例を示す
  //     const maxYPoint = currentContour.reduce((acc, point) => {
  //       return point.y > acc.y ? point : acc;
  //     });

  //     // 外輪郭を形成する一点の配列として最も適したものを選択
  //     if (maxYPoint) {
  //       // ここで外輪郭を形成する条件を設定する（例えば、最大距離が最も大きい点を選択する）
  //       const distance = calculateDistance(maxYPoint, currentContour);
  //       if (distance > maxDistance) {
  //         maxDistance = distance;
  //         outerContour = currentContour;
  //       }
  //     }
  //   }

  //   return outerContour;
  // }

  // // 与えられた点と輪郭の距離を計算する関数
  // function calculateDistance(pointA, contourB) {
  //   let minDistance = Infinity;

  //   contourB.forEach((pointB) => {
  //     const dist = distance(pointA, pointB);
  //     if (dist < minDistance) {
  //       minDistance = dist;
  //     }
  //   });

  //   return minDistance;
  // }

  // // 2つの点の間の距離を計算する関数
  // function distance(p1, p2) {
  //   return Math.sqrt(
  //     (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2
  //   );
  // }

  // 輪郭を描画する関数
  // function drawContour(ctx, contour) {
  //   ctx.clearRect(0, 0, canvas3.width, canvas3.height); // 既存の描画をクリア
  //   ctx.beginPath();
  //   ctx.strokeStyle = "blue";
  //   ctx.moveTo(
  //     canvas3.width / 2 + contour[0].x * 5,
  //     canvas3.height / 2 - contour[0].y * 5
  //   );
  //   contour.forEach((vertex, index) => {
  //     if (index > 0) {
  //       ctx.lineTo(
  //         canvas3.width / 2 + vertex.x * 5,
  //         canvas3.height / 2 - vertex.y * 5
  //       );
  //     }
  //   });
  //   ctx.closePath();
  //   ctx.stroke();
  // }

  tick();

  // 画面をレンダリング(アニメーション)
  function tick() {
    controls1.update();
    controls2.update();
    cameraPositionX.innerHTML = `X:${camera1.position.x.toFixed(2)}`;
    cameraPositionY.innerHTML = `Y:${camera1.position.y.toFixed(2)}`;
    cameraPositionZ.innerHTML = `Z:${camera1.position.z.toFixed(2)}`;
    renderer1.render(scene1, camera1);
    renderer2.render(scene2, camera2);
    requestAnimationFrame(tick);
  }
}
