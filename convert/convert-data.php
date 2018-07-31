<?php

// read inhouden.json
//  ID
//  LNiveau_x003a_Bouw  (LNiveau/Bouw) (bouw)
//  LLeergebied_x0020__x002f__x0020_ (lpib vak)
//  LDoorlopende_x0020_Leerlijn (lpib doorlopende leerlijn)
//  vakkern (zelf link maken op basis van tekst of uit obk lijst halen)
//  vaksubkern (zelf link maken op basis van tekst of uit obk lijst halen)
//  Inhoud_x0020_omschrijving
//  Begrippen
//  Tussendoel_x0020__x002f__x0020_E (Tussendoel / Eindterm)
//  LKerndoel
//  LNiveau
// read niveaus.json
//  ID
//  Title
//  Weergavenaam
//  LBouw	e.g: "12;#ob havo/vwo;#5;#ob vmbo;#78;#Overstijgend" -> 12,5,78 -> id's binnen niveaus.json
// read kerndoelen.json
//  ID
//  Title
//  Caption
//  Omschrijving
//  Specificatie
//  SoortKerndoel
// read eindtermen.json
//
// read vakken.json
//	ID
//	Title

/*
voor later / ter controle
  obk.json
    items zijn +- leereenheden
	  	inhoud
	  	bouw (ipv niveau's)
	  	kerndoel
	  	tussendoel
	  	vakkern
	  	subkern
	  	leergebied/vak

*/

// 1: niveaus - opsplitsen in bouw en opleidingsniveau (beheersingsniveau voor nu gelijk maken aan opleidingsniveau)
// 2: kerndoelen/eindtermen koppelen aan niveaus - LBouw als beheersingsniveau behandelen - later verfijnen met de hand
// 3: inhouden - koppelen aan doelen op 
// leerdoelen aanmaken - combinatie 1 doel + 1 beheersingsniveau (LNiveau)
//	Tussendoel/Eindterm -> tekst striptags matchen, nieuw? dan nieuw doel (tenzij eindterm, dan begint het met iets als 'AK/H/Domein E')
//  Lkerndoel - linken aan doel uit doelen.json of foutmelding als ie niet bestaat
// leerdoel linkt naar doel en niveau, als die combinatie al bestaat dan hergebruiken, anders aanmaken
/*
inhoud
	id: uuid
	omschrijving: Inhoud_x0020_omschrijving
	leerdoelen: []

leerdoel 
	doel: #ref
	beheersingsniveau: #ref

doel
	id: uuid
	titel: Caption / Title
	omschrijving: omschrijving

beheersingsniveau
*/

function guidv4() {
	$data = openssl_random_pseudo_bytes(16);
	$data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
	$data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
	return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data),4));
}

function readjson($file) {
	return json_decode(file_get_contents($file));
}

function clean($string) {
	return trim(strip_tags(str_replace('\r', '', str_replace('\n', "\n", $string))));
}

function parseReferences($string) {
	$parts = array_filter(
		explode(';', $string), 
		function($key) {
			return $key % 2 == 0;
		}, 
		ARRAY_FILTER_USE_KEY
	);	
	return array_values(array_map(
		function($link) {
			return preg_replace('/[^0-9]/', '', $link);
		}, 
		$parts
	));
}

function array_find($xs, $f) {
  foreach ($xs as $x) {
    if ($f($x) === true)
      return $x;
  }
  return null;
}

function array_find_sloID($xs, $id) {
	return array_find($xs, function($item) use ($id) {
		return $item->sloID == $id;
	});
}

function array_find_leerdoel($doel, $niveau) {
	global $out;
	$leerdoel = array_find($out['leerdoel'], function($item) use ($doel, $niveau) {
		if (!is_object($item)) {
			var_dump($item); die();
		}
		return ($item->doel_id==$doel && $item->beheersingsniveau_id==$niveau);
	});
	if ($leerdoel) {
		return $leerdoel->id;
	}
}

function object($properties) {
	$result = new stdClass();
	foreach($properties as $key => $value) {
		$result->$key = $value;
	}
	return $result;
}

$niveaus    = readjson('./niveaus.json');
$kerndoelen = readjson('./kerndoelen.json');
$eindtermen = readjson('./eindtermen.json');
$inhouden   = readjson('./inhouden.json');
$leerlijnen = readjson('./leerlijnenDev.json'); 
$vakken     = readjson('./vakken.json');

$niveausByID = [];
array_walk($niveaus, function($niveau) use (&$niveausByID) {
	$niveausByID[$niveau->ID] = $niveau;
});

$out = [];

$out['bouw'] = [];

$out['beheersingsniveau'] = array_map(function($niveau) {
	return object([
		'id' => guidv4(),
		'sloID' => $niveau->ID,
		'omschrijving' => $niveau->Title,
		'LBouw' => $niveau->LBouw
	]);
}, $niveaus);

$out['opleidingsniveau'] = array_map(function($niveau) use (&$niveausByID, &$out) {
	$niveauID = guidv4();
	$bouwen = parseReferences($niveau->LBouw);
	if ($bouwen) {
		array_walk($bouwen, function($bouw) use (&$out, $niveau,&$niveausByID, $niveauID) {
			$bouwOb = array_find_sloID($out['bouw'], $bouw);
			if (!$bouwOb) {
				$bouwOb = $niveausByID[$bouw];
				$bouwID = guidv4();
				//FIXME: bouw moet opleidingsniveau's hebben, dit is is een beheersingsniveau
				$out['bouw'][] = object([
					'id' => $bouwID,
					'sloID' => $bouwOb->ID,
					'titel' => $bouwOb->Title,
					'opleidingsniveau_id' => array(
						$niveauID
					)
				]);
				// store bouw index in $out['bouw'] so we can add opleidingsniveaus to it later
				$niveausByID[$bouw]->index = sizeof($out['bouw'])-1;
			} else {
				$out['bouw'][ $niveausByID[$bouw]->index ]->opleidingsniveau_id[] = $niveauID;
			}
		});
	}
	unset($niveau->LBouw);

	return object([
		'id' => $niveauID,
		'sloID' => $niveau->sloID,
		'omschrijving' => $niveau->omschrijving,
		'beheersingsniveau_id' => $niveau->id
	]);
}, $out['beheersingsniveau']);

$out['doel'] = array_map(function($doel) {
	return object([
		'id' => guidv4(),
		'sloID' => $doel->ID,
		'titel' => $doel->Caption,
		'omschrijving' => clean($doel->Omschrijving)
	]);
}, $kerndoelen);


$out['doel'] += array_map(function($doel) {
	return object([
		'id' => guidv4(),
		'sloID' => $doel->ID,
		'titel' => $doel->Title,
		'omschrijving' => clean($doel->Omschrijving)
	]);
}, $eindtermen);

$out['vak'] = array_map(function($vak) {
	return object([
		'id' => guidv4(),
		'sloID' => $vak->ID,
		'titel' => $vak->Title
	]);
}, $vakken);

$out['leerdoel'] = [];

$out['leerlijn'] = array_map(
	function($leerlijn) use ($out) {
		$bouwen = array_filter(array_map(
			function($bouw) use ($out) {
				$bouw = array_find_sloID($out['bouw'], $bouw);
				return isset($bouw) ? $bouw->id : null;
			}, 
			parseReferences($leerlijn->Lniveau)
		));
		return object([
			'id' => guidv4(),
			'sloID' => $leerlijn->ID,
			'titel' => $leerlijn->Title,
			'bouw_id' => array_values($bouwen)
		]);
	}, 
	$leerlijnen
);

$tussendoelen = [];

$out['inhoud'] = array_values(array_filter(array_map(function($inhoud) use (&$out, &$tussendoelen) {
	if (!isset($inhoud->Title)) {
		return null;
	}

	$inhoudID = guidv4();

	$beheersingsniveau = array_pop(parseReferences($inhoud->LNiveau));
	$beheersingsniveau = array_find_sloID($out['beheersingsniveau'], $beheersingsniveau);
	if ($beheersingsniveau) {
		$beheersingsniveau = $beheersingsniveau->id;
	} else {
//		echo "\nerror: LNiveau ".$inhoud['LNiveau']." not found (inhoud ".$inhoud['ID'].")";
	}

	$doel = isset($inhoud->Tussendoel_x0020__x002f__x0020_E) ? clean($inhoud->Tussendoel_x0020__x002f__x0020_E) : '';
	if ($doel && !in_array($doel, $tussendoelen)) {
		$tussendoelen[] = $doel;

		$tussendoelID = guidv4();
		$out['doel'][] = object([
			'id' => $tussendoelID,
			'sloID' => null,
			'titel' => $doel,
			'omschrijving' => $doel
		]);

		$leerdoelID = guidv4();
		$out['leerdoel'][] = object([
			'id' => $leerdoelID,
			'doel_id' => $tussendoelID,
			'beheersingsniveau_id' => $beheersingsniveau
		]);
	}

	$doelen = parseReferences($inhoud->Lkerndoel);
	$doelen = array_map(
		function($sloDoelID) use ($out, $inhoud) {
			$doel = array_find_sloID($out['doel'], $sloDoelID);
			if ($doel) {
				return $doel->id;
			} else {
//				echo "\nerror: Lkerndoel ".$sloDoelID." not found (inhoud ".$inhoud['ID'].")";
			}
		},
		$doelen
	);

	$inhoud_leerdoelen = array_map(
		function($doelID) use ($beheersingsniveau, &$out) {
			$leerdoelID = array_find_leerdoel($doelID, $beheersingsniveau);
			if (!$leerdoelID) {
				$leerdoelID = guidv4();
				$out['leerdoel'][] = object([
					'id' => $leerdoelID,
					'doel_id' => $doelID,
					'beheersingsniveau_id' => $beheersingsniveau
				]);
			}
			return $leerdoelID;
		}, 
		$doelen
	);

	if (isset($leerdoelID)) {
		$inhoud_leerdoelen[] = $leerdoelID;
	}
	$inhoud_leerdoelen = array_unique($inhoud_leerdoelen);

	// leerlijnen, vakken, vakkernen en vaksubkernen
	// zoek vak op
	$vakken = array_map(
		function($vakSLOID) use ($out) {
			return array_find_sloID($out['vak'], $vakSLOID);
		},
		parseReferences($inhoud->LLeergebied_x0020__x002f__x0020_)
	);
	// zoek leerlijn op
	$leerlijnen = array_map(
		function($leerlijnSLOID) use ($out) {
			return array_find_sloID($out['leerlijn'], $leerlijnSLOID);
		},
		parseReferences($inhoud->LDoorlopende_x0020_Leerlijn)
	);
	// koppel vak aan leerlijn
//	array_walk($leerlijnen, function($leerlijn) use (&$out) {
		//TODO hier gebleven
//	});
	// zoek vakkern op of maak aan, binnen vak
	// koppel vakkern aan vak
	// zoek vaksubkern op of maak aan, binnen vakkern
	// koppel vaksubkern aan vakkern
	// koppel inhoud aan vaksubkern // voor nu, later leereenheid gebruiken

	return array(
		'id' => $inhoudID,
		'titel' => isset($inhoud->Title) ? clean($inhoud->Title) : clean($inhoud->LinkTitle),
		'omschrijving' => isset($inhoud->Inhoud_x0020_omschrijving) ? clean($inhoud->Inhoud_x0020_omschrijving) : '',
		'leerdoel_id' => $inhoud_leerdoelen
	);

}, $inhouden)));

echo json_encode($out, JSON_PRETTY_PRINT);
