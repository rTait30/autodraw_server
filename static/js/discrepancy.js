function CalculatePoints(){
    // Edge Dimensions (milimeters)  
    var AB = parseFloat(document.getElementById("AB").value);
    var BC = parseFloat(document.getElementById("BC").value);
    var CD = parseFloat(document.getElementById("CD").value);
    var DA = parseFloat(document.getElementById("DA").value);

    // Point Height  (milimeters)  
    var HA = parseFloat(document.getElementById("HA").value);
    var HB = parseFloat(document.getElementById("HB").value);
    var HC = parseFloat(document.getElementById("HC").value);
    var HD = parseFloat(document.getElementById("HD").value);

    // Diagonal point to point  
    var AC = parseFloat(document.getElementById("AC").value);
    var BD = parseFloat(document.getElementById("BD").value);


    const inputs = [AB, BC, CD, DA, HA, HB, HC, HD, AC, BD];
    
    var calculateButton = document.getElementById("CalculateButton");
    var successInputs = true;

    inputs.forEach(input => {
        if(input == "" || input == null){
            successInputs = false;
        }
    });

    if(!successInputs){
        document.getElementById("discrepancy").innerHTML = "";
        document.getElementById("errorBD").innerHTML = "";
        alert("Please enter value in each input.");
    }
    else{  
        calculateButton.disabled = false;

        // From XYZ to XY
        var ABxy = Math.sqrt((AB ** 2) - ((HB - HA) ** 2) )
        var BCxy = Math.sqrt((BC ** 2) - ((HC - HB) ** 2) )
        var CDxy = Math.sqrt((CD ** 2) - ((HD - HC) ** 2) )
        var DAxy = Math.sqrt((DA ** 2) - ((HA - HD) ** 2) )
        var BDxy = Math.sqrt((BD ** 2) - ((HD - HB) ** 2) )
        var ACxy = Math.sqrt((AC ** 2) - ((HA - HC) ** 2) )

        // Caculate angles Cos and Sin

        // Angle from << AC and AB >>
        var angleABC = Math.acos( ( (ACxy ** 2) + (ABxy ** 2) - (BCxy ** 2) ) / ( 2*( ACxy * ABxy ) ) );

        // Angle from << AC and AD >>
        var angleACD = Math.acos( ( (ACxy ** 2) + (DAxy ** 2) - (CDxy ** 2) ) / ( 2*( ACxy * DAxy ) ) );

        // BD teorico
        // Calculate X and Y of B
        var Bx = ABxy * Math.cos(angleABC);
        var By = ABxy * Math.sin(angleABC);

        // Calculate X and Y of D
        var Dx = DAxy * Math.cos(angleACD);
        var Dy = (DAxy * Math.sin(angleACD) * - 1);

        var BDTeoricXY = Math.sqrt( ((Bx - Dx) ** 2) + ((By - Dy) ** 2) );

        // Calculate BD in XYZ
        var BDTeoricXYZ = Math.sqrt( ((Bx - Dx) ** 2) + ((By - Dy) ** 2) + ((HB -HD) ** 2) );

        // Discrepancy milimeters - BD is the input
        var discrepancy = BDTeoricXYZ - BD;

        // Error % - BD is the input
        var errorBD = (discrepancy / BDTeoricXYZ) * 100;

        if(document.getElementById("fabricType").value == "PVC"){
            var discrepancyMessge ="";
            if(Math.abs(discrepancy) <= 40){
                discrepancyMessge =  "Your dimensions are suitable for Four points <br />";
                document.getElementById("discrepancy").innerHTML =  discrepancyMessge + "<br /> Discrepancy: " + discrepancy.toFixed(2) + " (mm)";
            }else{
                discrepancyMessge = "<span class='highlight'>" +"Your dimensions are NOT suitable for Four points. <br /> Please recheck dimensions <br /><br />" + "</span>";
                document.getElementById("discrepancy").innerHTML = discrepancyMessge + "\n Discrepancy: " + discrepancy.toFixed(2) + " (mm)";
            }
        }else if(document.getElementById("fabricType").value == "ShadeCloth"){
            var discrepancyMessge ="";
            if(Math.abs(discrepancy) <= 80){
                discrepancyMessge =  "Your dimensions are suitable for Four points <br />";
                document.getElementById("discrepancy").innerHTML =  discrepancyMessge + "<br /> Discrepancy: " + discrepancy.toFixed(2) + " (mm)";
            }else{
                discrepancyMessge = "<span class='highlight'>" +"Your dimensions are NOT suitable for Four points. <br /> Please recheck dimensions <br /><br />" + "</span>";
                document.getElementById("discrepancy").innerHTML = discrepancyMessge + "\n Discrepancy: " + discrepancy.toFixed(2) + " (mm)";
            }
        }
        
        document.getElementById("errorBD").innerHTML = "Error: " + errorBD.toFixed(2) + "%";
    }
}