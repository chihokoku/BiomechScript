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
        drawOnCanvas(clippedEdges, document.getElementById("canvas3"), "black");
        drawOnCanvas(clippedEdges, document.getElementById("canvas4"), "black");
        console.log("全輪郭線分", clippedEdges);
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
  function drawOnCanvas(edges, canvas, color) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;

    // キャンバスの中心に描画するためのオフセット
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    const scale = 5; // スケールを調整して描画

    // 軸を描画
    drawAxesOnCanvas(ctx, offsetX, offsetY, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.beginPath();
    edges.forEach((edge) => {
      let [p1, p2] = edge;
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

  // canvas3でクリックで取得した座標を格納する配列
  const points = [];
  // canvas3でクリックして座標を取得
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
    if (points.length > 3) alert("Please push reset ");
    // 赤で円を描画
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    displayCoordinates(points);
    console.log(points);
    // return points;
  });

  // canvas4でクリックで取得した座標を格納する配列
  let points2 = [];
  // canvas4でクリックして座標を取得
  const canvas4 = document.getElementById("canvas4");
  const ctx4 = canvas4.getContext("2d");
  canvas4.addEventListener("click", function (event) {
    const rect = canvas4.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = x - canvas4.width / 2; // Canvasの中心のX座標
    const centerY = y - canvas4.height / 2; // Canvasの中心のY座標

    const relativeX = centerX / 5; // Canvas中心を原点とした相対X座標
    const relativeY = -(centerY / 5); // Canvas中心を原点とした相対Y座標

    if (points2.length > 10) {
      alert("over 10 points ");
    } else {
      points2.push({ x: relativeX, y: relativeY });
      console.log("point2", points2);
    }
    // 赤で円を描画
    ctx4.beginPath();
    ctx4.arc(x, y, 2, 0, 2 * Math.PI);
    ctx4.fillStyle = "red";
    ctx4.fill();
    displayCoordinates(points2);
    console.log(points);
    return points;
  });

  // 座標を表示する関数
  const coordinates = document.getElementById("coordinates");
  function displayCoordinates(point) {
    if (point.length > 0) {
      const latestPoint = point[point.length - 1];
      coordinates.innerHTML = `Latest Point: x=${latestPoint.x.toFixed(
        3
      )}, y=${latestPoint.y.toFixed(3)}`;
    }
  }
  // 座標値にデフォルト値として入力
  coordinates.innerHTML = `Latest Point: x=0.000, y=0.000`;

  // エッジ削除プログラム
  let filteredEdges = [];
  // let moreFilteredEdges = [];
  let clickCount = 0;
  const removeEdges = document.getElementById("removeEdges");
  removeEdges.addEventListener("click", function () {
    clickCount++;
    if (clickCount >= 2) {
      // 2回目以降のクリックで実行する処理
      filteredEdges = removeEdgesInsideTriangle2D(filteredEdges, ...points);
      drawOnCanvas(filteredEdges, document.getElementById("canvas3"), "black");
    } else {
      // 1回目のクリックで実行する処理
      filteredEdges = removeEdgesInsideTriangle2D(clippedEdges, ...points);
      drawOnCanvas(filteredEdges, document.getElementById("canvas3"), "black");
    }
    points.length = 0;
    coordinates.innerHTML = `Latest Point: x=0.000, y=0.000`;
    console.log("抽出されたエッジ", filteredEdges);
  });

  // 三角形の内部にあるエッジを削除する関数 (z値を無視)
  function removeEdgesInsideTriangle2D(edges, v0, v1, v2) {
    return edges.filter(([start, end]) => {
      // エッジの両端点が三角形の内部にあるかチェック (z値を無視)
      let startInside = isPointInTriangle2D(start, v0, v1, v2);
      let endInside = isPointInTriangle2D(end, v0, v1, v2);

      // 両端点のいずれかが三角形の内部にある場合は削除
      return !(startInside || endInside);
    });
  }

  // 点が三角形の内部にあるかどうかを判断する関数 (z値を無視)
  function isPointInTriangle2D(point, v0, v1, v2) {
    let alpha =
      ((v1.y - v2.y) * (point.x - v2.x) + (v2.x - v1.x) * (point.y - v2.y)) /
      ((v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y));
    let beta =
      ((v2.y - v0.y) * (point.x - v2.x) + (v0.x - v2.x) * (point.y - v2.y)) /
      ((v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y));
    let gamma = 1.0 - alpha - beta;

    return alpha > 0 && beta > 0 && gamma > 0;
  }

  // resetボタンを押した時の処理
  const reset = document.getElementById("reset");
  reset.addEventListener("click", function () {
    points.length = 0;
    points2.length = 0;
    coordinates.innerHTML = `Latest Point: x=0.000, y=0.000`;
    surfaceArea.innerHTML = `surfaceArea: 0.000`;
    clickCount = 0;
    document
      .getElementById("canvas3")
      .getContext("2d")
      .clearRect(
        0,
        0,
        document.getElementById("canvas3").width,
        document.getElementById("canvas3").height
      );
    document
      .getElementById("canvas4")
      .getContext("2d")
      .clearRect(
        0,
        0,
        document.getElementById("canvas4").width,
        document.getElementById("canvas4").height
      );
  });

  // getContour関数を実行した時の処理
  let filteredContour = [];
  const getContour = document.getElementById("getContour");
  getContour.addEventListener("click", function () {
    filteredContour = reconstructContour(filteredEdges);
    drawOnCanvas(filteredContour, document.getElementById("canvas3"), "purple");
  });

  // 3次元座標間における2点間の距離を計算する関数
  function distance3D(point1, point2) {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) +
        Math.pow(point1.y - point2.y, 2) +
        Math.pow(point1.z - point2.z, 2)
    );
  }

  // 最も近いエッジを探す関数
  function findClosestEdge(point, edges, visitedEdges) {
    let minDistance = Infinity;
    let closestEdge = null;

    edges.forEach(([start, end]) => {
      // 現在のエッジや既に訪れたエッジを除外
      if (
        visitedEdges.has(
          `${start.x},${start.y},${start.z}-${end.x},${end.y},${end.z}`
        ) ||
        visitedEdges.has(
          `${end.x},${end.y},${end.z}-${start.x},${start.y},${start.z}`
        )
      ) {
        return;
      }
      let distanceToStart = distance3D(point, start);
      let distanceToEnd = distance3D(point, end);
      let minEdgeDistance = Math.min(distanceToStart, distanceToEnd);

      if (minEdgeDistance < minDistance) {
        minDistance = minEdgeDistance;
        closestEdge = [start, end];
      }
    });

    return closestEdge;
  }

  // 最大Y座標の点を見つける関数
  function findMaxYPoint(edges) {
    let maxYPoint = edges[0][0];
    edges.forEach(([start, end]) => {
      if (start.y > maxYPoint.y) maxYPoint = start;
      if (end.y > maxYPoint.y) maxYPoint = end;
    });
    return maxYPoint;
  }

  // 最大X座標の点を見つける関数
  function findMaxXPoint(edges) {
    let maxXPoint = edges[0][0];
    edges.forEach(([start, end]) => {
      if (start.x > maxXPoint.x) maxXPoint = start;
      if (end.x > maxXPoint.x) maxXPoint = end;
    });
    return maxXPoint;
  }

  // 断面の輪郭を再構成し、繋がっていない線分を補完する関数
  function reconstructContour(edges) {
    if (edges.length === 0) return [];

    // 最大Y座標の点を見つける
    let maxYPoint = findMaxYPoint(edges);

    // 最大Y座標の点を含むエッジを見つける
    let initialEdgeIndex = edges.findIndex(
      ([start, end]) =>
        (start.x === maxYPoint.x &&
          start.y === maxYPoint.y &&
          start.z === maxYPoint.z) ||
        (end.x === maxYPoint.x &&
          end.y === maxYPoint.y &&
          end.z === maxYPoint.z)
    );

    // 最大Y座標の点が見つからなかった場合、最大X座標の点を探す
    if (initialEdgeIndex === -1) {
      let maxXPoint = findMaxXPoint(edges);
      initialEdgeIndex = edges.findIndex(
        ([start, end]) =>
          (start.x === maxXPoint.x &&
            start.y === maxXPoint.y &&
            start.z === maxXPoint.z) ||
          (end.x === maxXPoint.x &&
            end.y === maxXPoint.y &&
            end.z === maxXPoint.z)
      );
    }

    // 見つかったエッジを最初のエッジとして輪郭に追加
    let initialEdge = edges[initialEdgeIndex];
    edges.splice(initialEdgeIndex, 1);
    let contour = [initialEdge];

    // 訪れたエッジを記録するセット
    const visitedEdges = new Set();
    visitedEdges.add(
      `${initialEdge[0].x},${initialEdge[0].y},${initialEdge[0].z}-${initialEdge[1].x},${initialEdge[1].y},${initialEdge[1].z}`
    );
    visitedEdges.add(
      `${initialEdge[1].x},${initialEdge[1].y},${initialEdge[1].z}-${initialEdge[0].x},${initialEdge[0].y},${initialEdge[0].z}`
    );

    while (edges.length > 0) {
      let lastPoint = contour[contour.length - 1][1]; // 現在の輪郭の最後の点
      let found = false;

      for (let i = 0; i < edges.length; i++) {
        let [start, end] = edges[i];

        if (
          start.x === lastPoint.x &&
          start.y === lastPoint.y &&
          start.z === lastPoint.z
        ) {
          contour.push(edges[i]);
          edges.splice(i, 1);
          visitedEdges.add(
            `${start.x},${start.y},${start.z}-${end.x},${end.y},${end.z}`
          );
          visitedEdges.add(
            `${end.x},${end.y},${end.z}-${start.x},${start.y},${start.z}`
          );
          found = true;
          break;
        } else if (
          end.x === lastPoint.x &&
          end.y === lastPoint.y &&
          end.z === lastPoint.z
        ) {
          // エッジを逆にして追加
          contour.push([end, start]);
          edges.splice(i, 1);
          visitedEdges.add(
            `${start.x},${start.y},${start.z}-${end.x},${end.y},${end.z}`
          );
          visitedEdges.add(
            `${end.x},${end.y},${end.z}-${start.x},${start.y},${start.z}`
          );
          found = true;
          break;
        }
      }

      // 繋がるエッジが見つからなかった場合は補完
      if (!found) {
        let closestEdge = findClosestEdge(lastPoint, edges, visitedEdges);
        if (closestEdge) {
          // 現在のエッジから一番近いエッジをclosestEdgeとする
          let [closestStart, closestEnd] = closestEdge;
          // 現在のエッジの端点lastPointと一番近いエッジの端点closestStartを端点とするエッジを追加(補間)
          contour.push([lastPoint, closestStart]);
          // さらにclosestEdgeを追加
          contour.push(closestEdge);
          edges.splice(edges.indexOf(closestEdge), 1);
          visitedEdges.add(
            `${closestStart.x},${closestStart.y},${closestStart.z}-${closestEnd.x},${closestEnd.y},${closestEnd.z}`
          );
          visitedEdges.add(
            `${closestEnd.x},${closestEnd.y},${closestEnd.z}-${closestStart.x},${closestStart.y},${closestStart.z}`
          );
        } else {
          break; // 繋がるエッジが見つからない場合はループを終了
        }
      }
      if (
        lastPoint.x === maxYPoint.x &&
        lastPoint.y === maxYPoint.y &&
        lastPoint.z === maxYPoint.z
      ) {
        break;
      }
    }
    console.log("訪れたエッジ", visitedEdges);
    console.log("輪郭エッジ", contour);
    return contour;
  }

  // 面積値にデフォルト値として入力
  const surfaceArea = document.getElementById("surfaceArea");
  surfaceArea.innerHTML = `surfaceArea: 0.000`;

  // 面積を計算するためのボタンを取得
  const Area = document.getElementById("calculateArea");
  Area.addEventListener("click", function () {
    let area = calculateArea(
      filteredContour,
      document.getElementById("canvas3")
    );
    surfaceArea.innerHTML = `surfaceArea: ${area.toFixed(3)}`;
  });

  // 面積を計算する関数
  function calculateArea(contour, canvas) {
    if (contour.length < 3) {
      console.log("length is less than 3");
      return 0;
    }

    let vertices = [];
    contour.forEach((edge) => {
      vertices.push(edge[0], edge[1]);
    });

    // vertices配列を2D座標配列に変換
    const array = vertices.map((vertex) => ({ x: vertex.x, y: vertex.y }));

    // シューの公式でポリゴンの面積を計算
    let area = 0;
    for (let i = 0; i < array.length; i++) {
      const j = (i + 1) % array.length;
      area += array[i].x * array[j].y - array[j].x * array[i].y;
    }

    // ポリゴンを塗りつぶす;
    const ctx = canvas.getContext("2d");
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    const scale = 5;

    ctx.fillStyle = "#000000"; // ポリゴンの塗りつぶし色
    ctx.beginPath();
    array.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x * scale + offsetX, -point.y * scale + offsetY);
      } else {
        ctx.lineTo(point.x * scale + offsetX, -point.y * scale + offsetY);
      }
    });
    ctx.closePath();
    ctx.fill();

    // 2次元に投影された輪郭を生成
    // let projectedContour = contour.map(([start, end]) => {
    //   return [
    //     { x: start.x, y: start.y },
    //     { x: end.x, y: end.y },
    //   ];
    // });

    // シューの公式を用いて2次元の輪郭の面積を計算
    // let area = 0;
    // let ctx = canvas.getContext("2d");
    // ctx.beginPath();
    // ctx.moveTo(projectedContour[0][0].x * 100, projectedContour[0][0].y * 100);

    // for (let i = 0; i < projectedContour.length; i++) {
    //   let [start, end] = projectedContour[i];
    //   area += start.x * end.y - end.x * start.y;
    // }
    // ctx.closePath();
    // ctx.fillStyle = "black";
    // ctx.fill();
    area = Math.abs(area) / 2;
    return area;
  }

  // ボタンを押したら楕円近似する
  const ellipse = document.getElementById("ellipse");
  ellipse.addEventListener("click", function () {
    if (points2.length === 10) {
      let ellipse = fitEllipse(points2);
      drawEllipse(ellipse);
    } else {
      console.log("10個の座標が必要です");
    }
  });

  // 楕円近似するプログラム
  function fitEllipse(points) {
    if (points.length < 5) {
      console.error("最低でも5つの点が必要です。");
      return;
    }

    // x, y 座標の配列を作成
    let xs = points.map((p) => p.x);
    let ys = points.map((p) => p.y);

    // 数値ライブラリに入力するための行列を作成
    let A = xs.map((x, i) => [x * x, x * y, y * y, x, y, 1]);
    let B = numeric.add(
      numeric.mul(numeric.rep([points.length, 1], 0), 1),
      numeric.rep([points.length, 1], 1)
    );

    // 行列計算
    let AT = numeric.transpose(A);
    let ATA = numeric.dot(AT, A);
    let ATB = numeric.dot(AT, B);
    let ellipse = numeric.solve(ATA, ATB);

    return ellipse;
  }

  // 楕円描画するプログラム
  function drawEllipse(ellipse) {
    if (!ellipse) return;

    // 楕円のパラメータを取得
    // ここでは簡単な例として楕円のパラメータを固定
    // 実際には H 行列を使用して楕円の詳細なパラメータを求める必要があります

    ctx4.beginPath();
    ctx4.ellipse(250, 250, 100, 50, 0, 0, 2 * Math.PI);
    ctx4.strokeStyle = "red";
    ctx4.stroke();
  }

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
